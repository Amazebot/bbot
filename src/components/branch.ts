import { counter } from '../utils/id'
import logger from '../controllers/logger'
import config from '../controllers/config'
import bits from '../controllers/bits'
import * as middleware from './middleware'
import * as state from './state'
import * as conditions from './condition'
import * as message from './message'
import * as nlu from './nlu'

/** Branch matcher function interface, resolved value must be truthy. */
export interface IMatcher { (input: any): Promise<any> | any }

/** Called at the end of middleware with status of match */
export interface IDone { (matched: boolean): void }

/** Hold extra key/value data for extensions to use, such as ID */
export interface IOptions {
  id?: string
  force?: boolean
  [key: string]: any
}

/** Alias for acceptable branch action types. */
export type action = state.ICallback | string

/**
 * Process message in state and decide whether to act on it.
 * @param action Accepts an on-match callback, or creates one to execute a bit,
 *               by passing its key. The callback be given the final state.
 * @param meta   Any additional key/values to define the branch, such as 'id'
 */
export abstract class Branch {
  id: string
  callback: state.ICallback
  force: boolean = false
  match?: any
  matched?: boolean
  [key: string]: any

  /** Create a Branch */
  constructor (
    action: action,
    options: IOptions = {}
  ) {
    this.callback = (typeof action === 'string')
      ? (state) => bits.run(action, state)
      : action
    this.id = (options.id) ? options.id : counter('branch')
    for (let key in options) this[key] = options[key]
  }

  /**
   * Determine if this branch should trigger the callback.
   * Note that the method must be async, custom matcher will be promise wrapped.
   * Abstract input has no enforced type, but resolved result MUST be truthy.
   */
  abstract matcher (input: any): Promise<any>

  /**
   * Runs the matcher, then middleware and callback if matched.
   * Middleware can intercept and prevent the callback from executing.
   * If the state has already matched on prior branch, it will not match again
   * unless forced to, with the branch's `force` property.
   * @param b          State containing message to process
   * @param middleware Executes before the branch callback if matched
   * @param done       Called after middleware (optional), with match status
   */
  async process (
    b: state.State,
    middleware: middleware.Middleware,
    done: IDone = () => null
  ) {
    if (!b.matched || this.force) {
      this.match = await Promise.resolve(this.matcher(b.message))
      this.matched = (this.match) ? true : false
      if (this.matched) {
        b.setBranch(this)
        await middleware.execute(b, (b) => {
          logger.debug(`[branch] executing ${this.constructor.name} callback, ID ${this.id}`)
          return Promise.resolve(this.callback(b))
        }).then(() => {
          logger.debug(`[branch] ${this.id} process done (${(this.matched) ? 'matched' : 'no match'})`)
          return Promise.resolve(done(true))
        }).catch((err: Error) => {
          logger.error(`[branch] ${this.id} middleware error, ${err.message}`)
          return Promise.resolve(done(false))
        })
      } else {
        await Promise.resolve(done(false))
      }
    }
    return b
  }
}

/** Branch to match on any CatchAll type */
export class CatchAll extends Branch {
  /** Accepts only super args, matcher is fixed */
  constructor (action: action, options?: IOptions) {
    super(action, options)
  }

  /** Matching function looks for any CatchAll */
  async matcher (msg: message.Message) {
    if (msg instanceof message.CatchAll) {
      logger.debug(`[branch] message "${msg}" matched catch all ID ${this.id}`)
      return msg
    }
    return undefined
  }
}

/** Custom branch using unique matching function */
export class Custom extends Branch {
  /** Accepts custom function to test message */
  constructor (
    public customMatcher: IMatcher,
    action: action,
    options?: IOptions
  ) {
    super(action, options)
  }

  /** Standard matcher method routes to custom matching function */
  async matcher (msg: message.Message) {
    const match = await Promise.resolve(this.customMatcher(msg))
    if (match) {
      logger.debug(`[branch] message "${msg}" matched custom branch ID ${this.id}`)
    }
    return match
  }
}

/** Text branch uses basic regex matching */
export class Text extends Branch {
  conditions: conditions.Conditions

  /** Create text branch for regex pattern */
  constructor (
    match: conditions.Conditions | conditions.input,
    callback: action,
    options?: IOptions
  ) {
    super(callback, options)
    this.conditions = (match instanceof conditions.Conditions)
      ? match
      : conditions.create(match)
  }

  /**
   * Match message text against regex or composite conditions.
   * Resolves with either single match result or cumulative condition success.
   */
  async matcher (msg: message.Message) {
    this.conditions.exec(msg.toString())
    const match = this.conditions.match
    if (match) {
      logger.debug(`[branch] message "${msg}" matched branch ${this.id} conditions`)
    }
    return match
  }
}

/**
 * Text Direct Branch pre-matches the text for bot name prefix.
 * If matched on the direct pattern (name prefix) it runs the branch matcher on
 * a clone of the message with the prefix removed, this allows conditions like
 * `is` to operate on the body of the message, without failing due to a prefix.
 */
export class TextDirect extends Text {
  async matcher (msg: message.Text) {
    if (directPattern().exec(msg.toString())) {
      const indirectMessage = msg.clone()
      indirectMessage.text = msg.text.replace(directPattern(), '')
      return super.matcher(indirectMessage)
    } else {
      return false
    }
  }
}

/**
 * Natural language branch uses NLU result to match on intent, entities and/or
 * sentiment of optional score threshold. NLU must be trained to provide intent.
 */
export class NLU extends Branch {
  match: nlu.ResultsRaw | undefined

  /** Create natural language branch for NLU matching. */
  constructor (
    public criteria: nlu.Criteria,
    callback: action,
    options?: IOptions
  ) {
    super(callback, options)
  }

  /** Match on message's NLU attributes */
  async matcher (msg: message.Text) {
    if (!msg.nlu) {
      logger.error(`[branch] NLU attempted matching without NLU, ID ${this.id}`)
      return undefined
    }
    const match = msg.nlu.matchAllCriteria(this.criteria)
    if (match) {
      logger.debug(`[branch] NLU matched language branch ID ${this.id}`)
      return match
    }
    return undefined
  }
}

/** Natural Language Direct Branch pre-matches the text for bot name prefix. */
export class NLUDirect extends NLU {
  async matcher (msg: message.Text) {
    if (directPattern().exec(msg.toString())) {
      return super.matcher(msg)
    } else {
      return undefined
    }
  }
}

export interface IServerCriteria {
  [path: string]: any
}

/** Server branch matches data in a message received on the server. */
export class Server extends Branch {
  match: any

  /** Create server branch for data matching. */
  constructor (
    public criteria: IServerCriteria,
    callback: action,
    options?: IOptions
  ) {
    super(callback, options)
  }

  /**
   * Match on any exact or regex values at path of key in criteria.
   * Will also match on empty data if criteria is an empty object.
   */
  async matcher (msg: message.Server) {
    const match: { [path: string]: any } = {}
    if (
      Object.keys(this.criteria).length === 0 &&
      (
        typeof msg.data === 'undefined' ||
        Object.keys(msg.data).length === 0
      )
    ) {
      return match
    } else {
      if (!msg.data) {
        logger.error(`[branch] server branch attempted matching without data, ID ${this.id}`)
        return undefined
      }
    }
    for (let path in this.criteria) {
      const valueAtPath = path.split('.').reduce((pre, cur) => {
        return (typeof pre !== 'undefined') ? pre[cur] : undefined
      }, msg.data)
      if (
        this.criteria[path] instanceof RegExp &&
        this.criteria[path].exec(valueAtPath)
      ) match[path] = this.criteria[path].exec(valueAtPath)
      else if (
        this.criteria[path] === valueAtPath ||
        this.criteria[path].toString() === valueAtPath
      ) match[path] = valueAtPath
    }
    if (Object.keys(match).length) {
      logger.debug(`[branch] Data matched server branch ID ${this.id}`)
      return match
    }
    return undefined
  }
}

/**
 * Build a regular expression that matches text prefixed with the bot's name.
 * - matches when alias is substring of name
 * - matches when name is substring of alias
 */
export function directPattern () {
  let name = config.get('name') || ''
  let alias = config.get('alias') || ''
  name = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  alias = alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (!alias.length) return new RegExp(`^\\s*[@]?${name}[:,]?\\s*`, 'i')
  if (name.length > alias.length) {
    return new RegExp(`^\\s*[@]?(?:${name}[:,]?|${alias}[:,]?)\\s*`, 'i')
  }
  return new RegExp(`^\\s*[@]?(?:${alias}[:,]?|${name}[:,]?)\\s*`, 'i')
}

/** Build a regular expression for bot's name combined with another regex. */
export function directPatternCombined (regex: RegExp) {
  const regexWithoutModifiers = regex.toString().split('/')
  regexWithoutModifiers.shift()
  const modifiers = regexWithoutModifiers.pop()
  const pattern = regexWithoutModifiers.join('/')
  let name = config.get('name') || ''
  let alias = config.get('alias') || ''
  name = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  alias = alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (!alias.length) {
    return new RegExp(`^\\s*[@]?${name}[:,]?\\s*(?:${pattern})`, modifiers)
  }
  if (name.length > alias.length) {
    return new RegExp(`^\\s*[@]?(?:${name}[:,]?|${alias}[:,]?)\\s*(?:${pattern})`, modifiers)
  }
  return new RegExp(`^\\s*[@]?(?:${alias}[:,]?|${name}[:,]?)\\s*(?:${pattern})`, modifiers)
}
