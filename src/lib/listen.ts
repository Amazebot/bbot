import * as bot from '..'

/** Array of listeners to feed message streams via listen middleware */
export const listeners: {
  [id: string]: TextListener | CustomListener
} = {}

/** Array of special language listeners, processed by understand middleware */
export const nluListeners: {
  [id: string]: NaturalLanguageListener | CustomListener
} = {}

/** Clear current listeners, resetting initial empty listener objects */
export function unloadListeners () {
  for (let id in listeners) delete listeners[id]
  for (let id in nluListeners) delete nluListeners[id]
}

/** Interface for matcher functions - resolved value must be truthy */
export interface IMatcher {
  (input: any): Promise<any> | any
}

/** Interface for natural language matchers to evaluate returned NLU result */
export interface INaturalLanguageListenerOptions {
  intent?: string,                 // Match this intent string
  entities?: {[key: string]: any}, // Match these entities (never required)
  confidence?: number,             // Threshold for confidence matching
  requireConfidence?: boolean,     // Do not match without meeting threshold
  requireIntent?: boolean          // Do not match without intent
}

/** Match object interface for language matchers to populate */
export interface INaturalLanguageMatch {
  intent?: string | null, // the intent that was matched (if matched on intent)
  entities?: {[key: string]: any} // any subset of entities that were matched
  confidence?: number, // the confidence relative to the threshold (+/-)
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
      if (matched) bot.logger.debug(`Listener matched`, { id: this.meta.id })
      else bot.logger.debug(`Listener did not match`, { id: this.meta.id })
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
        bot.logger.debug(`Executing ${this.constructor.name} callback`, { id: this.meta.id })
        this.callback(b)
        return Promise.resolve(done())
      }
      const callback: bot.ICallback = (err) => {
        let result = (!err)
        if (err) bot.logger.error(err.message, err.stack)
        if (done) done(result)
      }
      return middleware.execute(b, complete, callback)
    } else {
      if (done) done(false)
      return b
    }
  }
}

/** Custom listeners use unique matching function */
export class CustomListener extends Listener {
  match: any

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
      bot.logger.debug(`Message "${message}" matched custom listener`, { id: this.meta.id })
    }
    return match
  }
}

/** Text listeners use basic regex matching */
export class TextListener extends Listener {
  match: RegExpMatchArray | undefined

  /** Create text listener for regex pattern */
  constructor (
    public regex: RegExp,
    callback: IListenerCallback | string,
    meta?: IListenerMeta
  ) {
    super(callback, meta)
  }

  /** Use async because matchers must return a promise */
  async matcher (message: bot.Message) {
    const match = message.toString().match(this.regex)
    if (match) {
      bot.logger.debug(`Message "${message}" matched text listener regex /${this.regex}/`, { id: this.meta.id })
    }
    return match
  }
}

/**
 * Language listener uses NLU adapter result to match on intent and (optionally)
 * entities and/or confidence threshold. NLU must be trained to provide intent.
 * @todo Update this concept, matcher is uninformed at this stage.
 * @todo Use argv / environment variable for default confidence threshold.
 */
export class NaturalLanguageListener extends Listener {
  match: INaturalLanguageMatch | undefined

  /** Create language listener for NLU matching */
  constructor (
    public options: INaturalLanguageListenerOptions,
    callback: IListenerCallback | string,
    meta?: IListenerMeta
  ) {
    super(callback, meta)
    if (!this.options.confidence) this.options.confidence = 80
    if (!this.options.entities) this.options.entities = {}
    if (!this.options.requireConfidence) this.options.requireConfidence = true
    if (!this.options.requireIntent) this.options.requireIntent = true
  }

  /** Match on message's NLU properties */
  async matcher (message: bot.TextMessage) {
    if (!message.nlu) {
      bot.logger.error('NaturalLanguageListener attempted matching without NLU', { id: this.meta.id })
      return undefined
    }

    const confidence = (message.nlu.confidence - this.options.confidence!)
    if (this.options.requireConfidence && confidence < 0) return undefined

    const intent: string | null = (this.options.intent === message.nlu.intent)
      ? message.nlu.intent
      : null
    if (this.options.intent && !message.nlu.intent) return undefined

    const entities: {[key: string]: any} = {}
    for (let key of Object.keys(this.options.entities!)) {
      if (
        JSON.stringify(this.options.entities![key]) ===
        JSON.stringify(message.nlu.entities[key])
      ) entities[key] = message.nlu.entities[key]
    }
    const match: INaturalLanguageMatch = { intent, entities, confidence }
    if (match) {
      bot.logger.debug(`NLU matched language listener for ${intent} intent with ${confidence} confidence ${confidence < 0 ? 'under' : 'over'} threshold`, { id: this.meta.id })
    }
    return match
  }
}

/** Create text listener with provided regex, action and optional meta */
export function listenText (
  regex: RegExp,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  const listener = new TextListener(regex, action, meta)
  listeners[listener.id] = listener
  return listener.id
}

/** Create text listener with regex prepended the bot's name */
export function listenDirect (
  regex: RegExp,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  const listener = new TextListener(directPattern(regex), action, meta)
  listeners[listener.id] = listener
  return listener.id
}

/** Create custom listener with provided matcher, action and optional meta */
export function listenCustom (
  matcher: IMatcher,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  const listener = new CustomListener(matcher, action, meta)
  listeners[listener.id] = listener
  return listener.id
}

/** Create a natural language listener to match on NLU result attributes */
export function understandText (
  options: INaturalLanguageListenerOptions,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  const nluListener = new NaturalLanguageListener(options, action, meta)
  nluListeners[nluListener.id] = nluListener
  return nluListener.id
}

/** @todo FIX THIS */
/*
export function understandDirect (
  options: INaturalLanguageListenerOptions,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  // const matcher = directPattern(/(.*)/) --> pass into custom listener...
  const nluListener = new NaturalLanguageListener(options, action, meta)
  nluListeners[nluListener.id] = nluListener
  return nluListener.id
}
*/

/** Create a custom listener to process NLU result with provided function */
export function understandCustom (
  matcher: IMatcher,
  action: IListenerCallback | string,
  meta?: IListenerMeta
): string {
  const nluListener = new CustomListener(matcher, action, meta)
  nluListeners[nluListener.id] = nluListener
  return nluListener.id
}

/** Build a regular expression that matches text prefixed with the bot's name */
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

  // matches properly when alias is substring of name
  if (botName.length > botAlias.length) {
    return new RegExp(`^\\s*[@]?(?:${botName}[:,]?|${botAlias}[:,]?)\\s*(?:${pattern})`, modifiers)
  }

  // matches properly when name is substring of alias
  return new RegExp(`^\\s*[@]?(?:${botAlias}[:,]?|${botName}[:,]?)\\s*(?:${pattern})`, modifiers)
}

/** Create a listener that triggers when user enters a room */
export function listenEnter (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: bot.Message) => message instanceof bot.EnterMessage, action, meta)
}

/** Create a listener that triggers when user leaves a room */
export function listenLeave (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: bot.Message) => message instanceof bot.LeaveMessage, action, meta)
}

/** Create a listener that triggers when user changes the topic */
export function listenTopic (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: bot.Message) => message instanceof bot.TopicMessage, action, meta)
}

/** Create a listener that triggers when no other listener matches */
export function listenCatchAll (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: bot.Message) => message instanceof bot.CatchAllMessage, action, meta)
}
