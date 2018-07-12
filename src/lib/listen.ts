import * as bot from '..'

/** Interface for matcher functions - resolved value must be truthy */
export interface IMatcher {
  (input: any): Promise<any> | any
}

/** Function called if the incoming message matches */
export interface IListenerCallback {
  (b: bot.B): any
}

/** Called at the end of middleware with status of match */
export interface IListenerDone {
  (matched: boolean): void
}

/** Hold extra key/value data for extensions to use, such as ID */
export interface IListenerMeta {
  id?: string,
  force?: boolean,
  [key: string]: any
}

/**
 * Receives every message from chat and decide whether to act on it.
 * @param action Accepts an on-match callback, or creates one to execute a bit,
 *               by passing its key. The callback be given the final state.
 * @param meta   Any additional key/values to define the listener, such as 'id'
 */
export abstract class Listener {
  callback: IListenerCallback
  id: string
  match: any
  force: boolean = false

  /** Create a listener, add to collection */
  constructor (
    action: IListenerCallback | string,
    public meta: IListenerMeta = {}
  ) {
    this.callback = (typeof action === 'string')
      ? (state) => bot.doBit(action, state)
      : action
    this.id = (this.meta.id) ? this.meta.id : bot.counter('listener')
    if (typeof this.meta.force !== 'undefined') this.force = this.meta.force
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
   * unless forced to, with the listener's `force` property. Consecutive matches
   * will overwrite the prior match result.
   * @param b          State containing message to listen on, from hear process
   * @param middleware Executes before the listener callback
   * @param done       Called after middleware (optional), with match status
   */
  async process (
    b: bot.B,
    middleware = new bot.Middleware('listener'),
    done: IListenerDone = (matched) => {
      bot.logger.debug(`[listener] ${this.id} process done (${(matched) ? 'matched' : 'no match'})`)
    }
  ): Promise<bot.B> {
    const match = await Promise.resolve(this.matcher(b.message))
    const matched = (match) ? true : false
    if (!matched && !b.matched) b.matched = false // set unless already matched
    if (matched && b.matched && this.force) b.matched = false // force rematch
    if (matched && !b.matched) {
      b.listener = this
      b.match = match
      b.matched = matched
      const complete: bot.IComplete = (b, done) => {
        bot.logger.debug(`[listen] executing ${this.constructor.name} callback for ID ${this.id}`)
        return Promise.resolve(this.callback(b)).then(() => done())
      }
      const callback: bot.ICallback = (err) => {
        let result = (!err)
        if (err) bot.logger.error(err.message, err.stack)
        if (done) done(result)
      }
      return middleware.execute(b, complete, callback)
    } else {
      if (done) done(false)
      return Promise.resolve(b)
    }
  }
}

/** Listener to match on any CatchAllMessage type */
export class CatchAllListener extends Listener {
  /** Accepts only super args, matcher is fixed */
  constructor (action: IListenerCallback | string, meta?: IListenerMeta) {
    super(action, meta)
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
    meta?: IListenerMeta
  ) {
    super(action, meta)
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
    meta?: IListenerMeta
  ) {
    super(callback, meta)
  }

  /** Use async because matchers must return a promise */
  async matcher (message: bot.Message): Promise<RegExpMatchArray | null> {
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
    meta?: IListenerMeta
  ) {
    super(callback, meta)
  }

  /** Match on message's NLU attributes */
  async matcher (message: bot.TextMessage): Promise<bot.NaturalLanguageResultsRaw | undefined> {
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

/** Collection of listeners and the methods to create each type */
export class Listeners {
  listen: { [id: string]: TextListener | CustomListener } = {}
  understand: { [id: string]: NaturalLanguageListener | CustomListener } = {}
  act: { [id: string]: CatchAllListener } = {}

  /** Create text listener with provided regex, action and optional meta */
  text (
    regex: RegExp,
    action: IListenerCallback | string,
    meta?: IListenerMeta
  ): string {
    const listener = new TextListener(regex, action, meta)
    this.listen[listener.id] = listener
    return listener.id
  }

  /** Create text listener with regex prepended the bot's name */
  direct (
    regex: RegExp,
    action: IListenerCallback | string,
    meta?: IListenerMeta
  ): string {
    const listener = new TextListener(directPattern(regex), action, meta)
    this.listen[listener.id] = listener
    return listener.id
  }

  /** Create custom listener with provided matcher, action and optional meta */
  custom (
    matcher: IMatcher,
    action: IListenerCallback | string,
    meta?: IListenerMeta
  ): string {
    const listener = new CustomListener(matcher, action, meta)
    this.listen[listener.id] = listener
    return listener.id
  }

  /** Create a listener that triggers when no other listener matches */
  catchAll (
    action: IListenerCallback | string,
    meta?: IListenerMeta
  ): string {
    const listener = new CatchAllListener(action, meta)
    this.act[listener.id] = listener
    return listener.id
  }

  /** Create a natural language listener to match on NLU result attributes */
  understandText (
    criteria: bot.NaturalLanguageCriteria,
    action: IListenerCallback | string,
    meta?: IListenerMeta
  ): string {
    const nluListener = new NaturalLanguageListener(criteria, action, meta)
    this.understand[nluListener.id] = nluListener
    return nluListener.id
  }

  /*
  understandDirect (
    options: INaturalLanguageMatcher,
    action: IListenerCallback | string,
    meta?: IListenerMeta
  ): string {
    // const matcher = directPattern(/(.*)/) --> pass into custom listener...
    const nluListener = new NaturalLanguageListener(options, action, meta)
    this.understand[nluListener.id] = nluListener
    return nluListener.id
  }
  */

  /** Proxy to create global NLU listener */
  understandCustom (
    matcher: IMatcher,
    action: IListenerCallback | string,
    meta?: IListenerMeta
  ): string {
    const nluListener = new CustomListener(matcher, action, meta)
    this.understand[nluListener.id] = nluListener
    return nluListener.id
  }

  /** Create a listener that triggers when user enters a room */
  enter (action: IListenerCallback | string, meta?: IListenerMeta) {
    return this.custom((message: bot.Message) => message instanceof bot.EnterMessage, action, meta)
  }

  /** Create a listener that triggers when user leaves a room */
  leave (action: IListenerCallback | string, meta?: IListenerMeta) {
    return this.custom((message: bot.Message) => message instanceof bot.LeaveMessage, action, meta)
  }

  /** Create a listener that triggers when user changes the topic */
  topic (action: IListenerCallback | string, meta?: IListenerMeta) {
    return this.custom((message: bot.Message) => message instanceof bot.TopicMessage, action, meta)
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
  meta?: IListenerMeta
): string {
  return globalListeners.text(regex, action, meta)
}

/** Proxy to create global direct listener */
export function listenDirect (
  regex: RegExp,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  return globalListeners.direct(regex, action, meta)
}

/** Proxy to create global custom listener */
export function listenCustom (
  matcher: IMatcher,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  return globalListeners.custom(matcher, action, meta)
}

/** Proxy to create global catch all listener */
export function listenCatchAll (
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  return globalListeners.catchAll(action, meta)
}

/** Proxy to create global NLU listener */
export function understandText (
  criteria: bot.NaturalLanguageCriteria,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  return globalListeners.understandText(criteria, action, meta)
}

/** Proxy to create global NLU listener */
export function understandCustom (
  matcher: IMatcher,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  return globalListeners.understandCustom(matcher, action, meta)
}

/** Proxy to create global enter room listener */
export function listenEnter (action: IListenerCallback | string, meta?: IListenerMeta) {
  return globalListeners.enter(action, meta)
}

/** Proxy to create global leave room listener */
export function listenLeave (action: IListenerCallback | string, meta?: IListenerMeta) {
  return globalListeners.leave(action, meta)
}

/** Proxy to create global topic change listener */
export function listenTopic (action: IListenerCallback | string, meta?: IListenerMeta) {
  return globalListeners.topic(action, meta)
}

/**
 * Build a regular expression that matches text prefixed with the bot's name
 * - matches when alias is substring of name
 * - matches when name is substring of alias
 */
export function directPattern (regex: RegExp): RegExp {
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
