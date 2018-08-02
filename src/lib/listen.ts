import * as bot from '..'

/** Interface for matcher functions - resolved value must be truthy */
export interface IMatcher {
  (input: any): Promise<any> | any
}

/** Function called if the incoming message matches */
export interface IListenerCallback {
  (b: bot.State): any
}

/** Called at the end of middleware with status of match */
export interface IListenerDone {
  (matched: boolean): void
}

/** Hold extra key/value data for extensions to use, such as ID */
export interface IListener {
  id?: string
  force?: boolean
  [key: string]: any
}

/**
 * Receives every message from chat and decide whether to act on it.
 * @param action Accepts an on-match callback, or creates one to execute a bit,
 *               by passing its key. The callback be given the final state.
 * @param meta   Any additional key/values to define the listener, such as 'id'
 */
export abstract class Listener {
  id: string
  callback: IListenerCallback
  force: boolean = false
  match?: any
  matched?: boolean
  [key: string]: any

  /** Create a listener, add to collection */
  constructor (
    action: IListenerCallback | string,
    options: IListener = {}
  ) {
    this.callback = (typeof action === 'string')
      ? (state) => bot.doBit(action, state)
      : action
    this.id = (options.id) ? options.id : bot.counter('listener')
    for (let key in options) this[key] = options[key]
  }

  /**
   * Determine if this listener should trigger the callback.
   * Note that the method must be async, custom matcher will be promise wrapped.
   * Abstract input has no enforced type, but resolved result MUST be truthy.
   */
  abstract matcher (input: any): Promise<any>

  /**
   * Runs the matcher, then middleware and callback if matched.
   * Middleware can intercept and prevent the callback from executing.
   * If the state has already matched on prior listener, it will not match again
   * unless forced to, with the listener's `force` property.
   * @param b          State containing message to listen on, from hear process
   * @param middleware Executes before the listener callback
   * @param done       Called after middleware (optional), with match status
   */
  async process (
    b: bot.State,
    middleware = new bot.Middleware('listener'),
    done: IListenerDone = () => null
  ) {
    if (!b.matched || this.force) {
      this.match = await Promise.resolve(this.matcher(b.message))
      this.matched = (this.match) ? true : false
      if (this.matched) {
        b.setListener(this)
        await middleware.execute(b, (b) => {
          bot.logger.debug(`[listen] executing ${this.constructor.name} callback for ID ${this.id}`)
          b.processed.listen = Date.now() // workaround for thought process timestamp ordering
          return Promise.resolve(this.callback(b))
        }).then(() => {
          bot.logger.debug(`[listen] ${this.id} process done (${(this.matched) ? 'matched' : 'no match'})`)
          return Promise.resolve(done(true))
        }).catch((err) => {
          bot.logger.error(`[listen] ${this.id} middleware error, ${err.message}`)
          return Promise.resolve(done(false))
        })
      } else {
        await Promise.resolve(done(false))
      }
    }
    return b
  }
}

/** Listener to match on any CatchAllMessage type */
export class CatchAllListener extends Listener {
  /** Accepts only super args, matcher is fixed */
  constructor (action: IListenerCallback | string, options?: IListener) {
    super(action, options)
  }

  /** Matching function looks for any CatchAllMessage */
  async matcher (message: bot.Message) {
    if (message instanceof bot.CatchAllMessage) {
      bot.logger.debug(`[listen] message "${message}" matched catch all ID ${this.id}`)
      return message
    }
    return undefined
  }
}

/** Custom listeners use unique matching function */
export class CustomListener extends Listener {
  /** Accepts custom function to test message */
  constructor (
    public customMatcher: IMatcher,
    action: IListenerCallback | string,
    options?: IListener
  ) {
    super(action, options)
  }

  /** Standard matcher method routes to custom matching function */
  async matcher (message: bot.Message) {
    const match = await Promise.resolve(this.customMatcher(message))
    if (match) {
      bot.logger.debug(`[listen] message "${message}" matched custom listener ID ${this.id}`)
    }
    return match
  }
}

/** Text listeners use basic regex matching */
export class TextListener extends Listener {
  /** Create text listener for regex pattern */
  constructor (
    public regex: RegExp,
    callback: IListenerCallback | string,
    options?: IListener
  ) {
    super(callback, options)
  }

  /** Use async because matchers must return a promise */
  async matcher (message: bot.Message) {
    const match = message.toString().match(this.regex)
    if (match) {
      bot.logger.debug(`[listen] message "${message}" matched text listener regex /${this.regex}/ ID ${this.id}`)
    }
    return match
  }
}

/**
 * Language listener uses NLU adapter result to match on intent, entities and/or
 * sentiment of optional score threshold. NLU must be trained to provide intent.
 */
export class NaturalLanguageListener extends Listener {
  match: bot.NaturalLanguageResultsRaw | undefined

  /** Create language listener for NLU matching. Options override defaults */
  constructor (
    public criteria: bot.NaturalLanguageCriteria,
    callback: IListenerCallback | string,
    options?: IListener
  ) {
    super(callback, options)
  }

  /** Match on message's NLU attributes */
  async matcher (message: bot.TextMessage) {
    if (!message.nlu) {
      bot.logger.error(`[listen] NaturalLanguageListener attempted matching without NLU for ID ${this.id}`)
      return undefined
    }
    const match = message.nlu.matchAllCriteria(this.criteria)
    if (match) {
      bot.logger.debug(`[listen] NLU matched language listener for ID ${this.id}`)
      return match
    }
    return undefined
  }
}

/** Natural Language Direct Listener pre-matches the text for bot name prefix */
export class NaturalLanguageListenerDirect extends NaturalLanguageListener {
  async matcher (message: bot.TextMessage) {
    if (directPattern(/.*/).exec(message.toString())) {
      return super.matcher(message)
    } else {
      return undefined
    }
  }
}

export interface IListeners {
  scope?: string
  listen?: { [id: string]: TextListener | CustomListener }
  understand?: { [id: string]: NaturalLanguageListener | CustomListener }
  act?: { [id: string]: CatchAllListener }
}

/** Collection of listeners and the methods to create each type */
export class Listeners implements IListeners {
  scope: string
  listen: { [id: string]: TextListener | CustomListener }
  understand: { [id: string]: NaturalLanguageListener | CustomListener }
  act: { [id: string]: CatchAllListener }

  constructor (listeners: Listeners | IListeners = {}) {
    this.scope = (listeners.scope) ? listeners.scope : 'global'
    this.listen = (listeners.listen) ? listeners.listen : {}
    this.understand = (listeners.understand) ? listeners.understand : {}
    this.act = (listeners.act) ? listeners.act : {}
  }

  /** Remove all but forced listeners from collection, return remaining size */
  forced (collection: 'listen' | 'understand' | 'act') {
    for (let id in this[collection]) {
      if (!this[collection][id].force) delete this[collection][id]
    }
    return Object.keys(this[collection]).length
  }

  /** Create text listener with provided regex, action and options */
  text (
    regex: RegExp,
    action: IListenerCallback | string,
    options?: IListener
  ) {
    const listener = new TextListener(regex, action, options)
    this.listen[listener.id] = listener
    return listener.id
  }

  /** Create text listener with regex prepended the bot's name */
  direct (
    regex: RegExp,
    action: IListenerCallback | string,
    options?: IListener
  ) {
    const listener = new TextListener(directPattern(regex), action, options)
    this.listen[listener.id] = listener
    return listener.id
  }

  /** Create custom listener with provided matcher, action and optional meta */
  custom (
    matcher: IMatcher,
    action: IListenerCallback | string,
    options?: IListener
  ) {
    const listener = new CustomListener(matcher, action, options)
    this.listen[listener.id] = listener
    return listener.id
  }

  /** Create a listener that triggers when no other listener matches */
  catchAll (
    action: IListenerCallback | string,
    options?: IListener
  ) {
    const listener = new CatchAllListener(action, options)
    this.act[listener.id] = listener
    return listener.id
  }

  /** Create a natural language listener to match on NLU result attributes */
  understandText (
    criteria: bot.NaturalLanguageCriteria,
    action: IListenerCallback | string,
    options?: IListener
  ) {
    const nluListener = new NaturalLanguageListener(criteria, action, options)
    this.understand[nluListener.id] = nluListener
    return nluListener.id
  }

  understandDirect (
    criteria: bot.NaturalLanguageCriteria,
    action: IListenerCallback | string,
    options?: IListener
  ) {
    const nluListener = new NaturalLanguageListenerDirect(criteria, action, options)
    this.understand[nluListener.id] = nluListener
    return nluListener.id
  }

  /** Proxy to create global NLU listener */
  understandCustom (
    matcher: IMatcher,
    action: IListenerCallback | string,
    options?: IListener
  ) {
    const nluListener = new CustomListener(matcher, action, options)
    this.understand[nluListener.id] = nluListener
    return nluListener.id
  }

  /** Create a listener that triggers when user enters a room */
  enter (action: IListenerCallback | string, options?: IListener) {
    return this.custom((message: bot.Message) => message instanceof bot.EnterMessage, action, options)
  }

  /** Create a listener that triggers when user leaves a room */
  leave (action: IListenerCallback | string, options?: IListener) {
    return this.custom((message: bot.Message) => message instanceof bot.LeaveMessage, action, options)
  }

  /** Create a listener that triggers when user changes the topic */
  topic (action: IListenerCallback | string, options?: IListener) {
    return this.custom((message: bot.Message) => message instanceof bot.TopicMessage, action, options)
  }
}

/**
 * Collection of listeners to process against incoming messages in a global
 * context, i.e. not within any specific isolated conversational pathway.
 * Each is processed by middleware with the same name as the key.
 */
export const globalListeners = new Listeners()

/** Clear current listeners, resetting initial empty listener objects */
export function unloadListeners () {
  globalListeners.listen = {}
  globalListeners.understand = {}
  globalListeners.act = {}
}

/** Proxy to create global text listener */
export function listenText (
  regex: RegExp,
  action: IListenerCallback | string,
  options?: IListener
) {
  return globalListeners.text(regex, action, options)
}

/** Proxy to create global direct listener */
export function listenDirect (
  regex: RegExp,
  action: IListenerCallback | string,
  options?: IListener
) {
  return globalListeners.direct(regex, action, options)
}

/** Proxy to create global custom listener */
export function listenCustom (
  matcher: IMatcher,
  action: IListenerCallback | string,
  options?: IListener
) {
  return globalListeners.custom(matcher, action, options)
}

/** Proxy to create global catch all listener */
export function listenCatchAll (
  action: IListenerCallback | string,
  options?: IListener
) {
  return globalListeners.catchAll(action, options)
}

/** Proxy to create global NLU listener */
export function understandText (
  criteria: bot.NaturalLanguageCriteria,
  action: IListenerCallback | string,
  options?: IListener
) {
  return globalListeners.understandText(criteria, action, options)
}

/** Proxy to create global NLU direct listener */
export function understandDirect (
  criteria: bot.NaturalLanguageCriteria,
  action: IListenerCallback | string,
  options?: IListener
) {
  return globalListeners.understandDirect(criteria, action, options)
}

/** Proxy to create global NLU listener */
export function understandCustom (
  matcher: IMatcher,
  action: IListenerCallback | string,
  options?: IListener
) {
  return globalListeners.understandCustom(matcher, action, options)
}

/** Proxy to create global enter room listener */
export function listenEnter (action: IListenerCallback | string, options?: IListener) {
  return globalListeners.enter(action, options)
}

/** Proxy to create global leave room listener */
export function listenLeave (action: IListenerCallback | string, options?: IListener) {
  return globalListeners.leave(action, options)
}

/** Proxy to create global topic change listener */
export function listenTopic (action: IListenerCallback | string, options?: IListener) {
  return globalListeners.topic(action, options)
}

/**
 * Build a regular expression that matches text prefixed with the bot's name
 * - matches when alias is substring of name
 * - matches when name is substring of alias
 */
export function directPattern (regex: RegExp) {
  const regexWithoutModifiers = regex.toString().split('/')
  regexWithoutModifiers.shift()
  const modifiers = regexWithoutModifiers.pop()
  const pattern = regexWithoutModifiers.join('/')
  const botName = bot.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (!bot.alias) {
    return new RegExp(`^\\s*[@]?${botName}[:,]?\\s*(?:${pattern})`, modifiers)
  }
  const botAlias = bot.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (botName.length > botAlias.length) {
    return new RegExp(`^\\s*[@]?(?:${botName}[:,]?|${botAlias}[:,]?)\\s*(?:${pattern})`, modifiers)
  }
  return new RegExp(`^\\s*[@]?(?:${botAlias}[:,]?|${botName}[:,]?)\\s*(?:${pattern})`, modifiers)
}
