/** @module listener */

import {
  logger,
  Message,
  Middleware,
  State,
  IState,
  counter,
  IComplete,
  ICallback,
  EnterMessage,
  LeaveMessage,
  TopicMessage,
  CatchAllMessage,
  name,
  alias,
  doBit
} from '..'

/**
 * @todo Do NOT use `match` as truthy, add explicit `pass` boolean instead.
 *       Allows intent to be populated and set `pass` when `match` is null.
 */

/** Array of listeners to feed message streams */
export const listeners: {
  [id: string]: Listener
} = {}

/** Interface for matcher functions - resolved value must be truthy */
export interface IMatcher {
  (message: Message): Promise<any> | any
}

/** Function called if the incoming message matches */
export interface IListenerCallback {
  (state: IState): void
}

/** Called at the end of middleware with status of match */
export interface IListenerDone {
  (matched: boolean): void
}

/** Hold extra key/value data for extensions to use, such as ID */
export interface IListenerMeta {
  id?: string,
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
  /** Create a listener, add to collection */
  constructor (
    action: IListenerCallback | string,
    public meta: IListenerMeta = {}
  ) {
    this.callback = (typeof action === 'string')
      ? (state) => doBit(action, state)
      : action
    this.id = (this.meta.id) ? this.meta.id : counter('listener')
  }

  /**
   * Determine if this listener should trigger the callback
   * Note that the method can be async or not, custom matchers will be wrapped
   * with a forced promise resolve in case they return immediately.
   */
  abstract matcher (message: Message): Promise<any> | any

  /**
   * Runs the matcher, then middleware and callback if matched.
   * Middleware can intercept and prevent the callback from executing.
   * @param message    The message to listen on
   * @param middleware Executes before the listener callback
   * @param done       Called after middleware (optional), with match status
   */
  async process (
    message: Message,
    middleware: Middleware = new Middleware('listener'),
    done: IListenerDone = (matched) => {
      if (matched) logger.debug(`Listener matched`, { id: this.meta.id })
      else logger.debug(`Listener did not match`, { id: this.meta.id })
    }
  ): Promise<IState> {
    const match = await Promise.resolve(this.matcher(message))
    const state = new State({
      message: message,
      listener: this,
      match: match
    })
    if (match) {
      const complete: IComplete = (state, done) => {
        logger.debug(`Executing ${this.constructor.name} callback`, { id: this.meta.id })
        this.callback(state)
        return Promise.resolve(done())
      }
      const callback: ICallback = (err) => {
        let result = (!err)
        if (err) logger.error(err.message, err.stack)
        if (done) done(result)
      }
      return middleware.execute(state, complete, callback)
    } else {
      if (done) done(false)
      return state
    }
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
  async matcher (message: Message) {
    const match = await Promise.resolve(this.customMatcher(message))
    if (match) {
      logger.debug(`Message "${message}" matched custom listener`, { id: this.meta.id })
    }
    return match
  }
}

/** Text listeners use basic regex matching */
export class TextListener extends Listener {
  /** Accepts regex before standard arguments */
  constructor (
    public regex: RegExp,
    callback: IListenerCallback | string,
    meta?: IListenerMeta
  ) {
    super(callback, meta)
  }

  /** Use async because matchers must return a promise */
  async matcher (message: Message) {
    const match = message.toString().match(this.regex)
    if (match) {
      logger.debug(`Message "${message}" matched text listener regex /${this.regex}/`, { id: this.meta.id })
    }
    return match
  }
}

/** @todo LanguageListener - match intent and confidence threshold */

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

/** Build a regular expression that matches text prefixed with the bot's name */
export function directPattern (regex: RegExp): RegExp {
  const regexWithoutModifiers = regex.toString().split('/')
  regexWithoutModifiers.shift()
  const modifiers = regexWithoutModifiers.pop()
  const startsWithAnchor = regexWithoutModifiers[0] && regexWithoutModifiers[0][0] === '^'
  const pattern = regexWithoutModifiers.join('/')
  const botName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

  if (startsWithAnchor) {
    logger.warn(`Anchors don't work well with direct listens, perhaps you want to use standard listen`)
    logger.warn(`The regex in question was ${regex.toString()}`)
  }

  if (!alias) {
    return new RegExp(`^\\s*[@]?${botName}[:,]?\\s*(?:${pattern})`, modifiers)
  }

  const botAlias = alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

  // matches properly when alias is substring of name
  if (botName.length > botAlias.length) {
    return new RegExp(`^\\s*[@]?(?:${botName}[:,]?|${botAlias}[:,]?)\\s*(?:${pattern})`, modifiers)
  }

  // matches properly when name is substring of alias
  return new RegExp(`^\\s*[@]?(?:${botAlias}[:,]?|${botName}[:,]?)\\s*(?:${pattern})`, modifiers)
}

/** Create a listener that triggers when user enters a room */
export function listenEnter (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: Message) => message instanceof EnterMessage, action, meta)
}

/** Create a listener that triggers when user leaves a room */
export function listenLeave (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: Message) => message instanceof LeaveMessage, action, meta)
}

/** Create a listener that triggers when user changes the topic */
export function listenTopic (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: Message) => message instanceof TopicMessage, action, meta)
}

/** Create a listener that triggers when no other listener matches */
export function listenCatchAll (action: IListenerCallback | string, meta?: IListenerMeta) {
  return listenCustom((message: Message) => message instanceof CatchAllMessage, action, meta)
}
