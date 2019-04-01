/**
 * Defines, creates and collects branches for each thought process.
 * @module components/branch
 */

import config from '../util/config'
import logger from '../util/logger'
import { counter } from '../util/id'
import { bits } from './bit'
import { Middleware } from './middleware'
import { State, ICallback } from './state'
import { Conditions, ConditionInput } from './condition'
import {
  Message,
  TextMessage,
  CatchAllMessage,
  ServerMessage,
  EnterMessage,
  LeaveMessage,
  TopicMessage
} from './message'
import { NLUCriteria, NLUResultsRaw } from './nlu'

export enum ProcessKey { listen, understand, serve, act }
export type ProcessKeys = keyof typeof ProcessKey

/** Branch matcher function interface, resolved value must be truthy. */
export interface IMatcher { (input: any): Promise<any> | any }

/** Called at the end of middleware with status of match. */
export interface IDone { (matched: boolean): void }

/** Attributes for branch. */
export interface IBranch {
  id?: string
  force?: boolean
  processKey?: ProcessKeys
  [key: string]: any
}

/** Alias for acceptable branch action types. */
export type action = ICallback | string

/**
 * Process message in state and decide whether to act on it.
 * @param action Accepts an on-match callback, or creates one to execute a bit,
 *               by passing its key. The callback be given the final state.
 * @param meta   Any additional key/values to define the branch, such as 'id'
 */
export abstract class Branch implements IBranch {
  id: string
  /** Action to take on matching input. */
  callback: ICallback
  /** Force matching on this branch regardless of other matched branches. */
  force: boolean = false
  /** The thought process collection the branch should be applied. */
  processKey: ProcessKeys = 'listen'
  /** The result of branch matcher on input. */
  match?: any
  /** Status of match. */
  matched?: boolean
  [key: string]: any

  /** Create a Branch */
  constructor (
    action: action,
    atts: IBranch = {}
  ) {
    this.callback = (typeof action === 'string')
      ? (state) => bits.run(action, state)
      : action
    this.id = (atts.id) ? atts.id : counter('branch')
    for (let key in atts) this[key] = atts[key]
  }

  /**
   * Determine if this branch should trigger the callback.
   * Note that the method must be async, custom matcher will be promise wrapped.
   * Abstract input has no enforced type, but resolved result MUST be truthy.
   */
  abstract matcher (input: any): Promise<any>

  /** Get the branch type, allows filtering processing. */
  get type () {
    return this.constructor.name
  }

  /**
   * Runs the matcher, then middleware and callback if matched.
   * Middleware can intercept and prevent the callback from executing.
   * If the state has already matched on prior branch, it will not match again
   * unless forced to, with the branch's `force` property.
   * @param b          State containing message to process
   * @param middleware Executes before the branch callback if matched
   * @param done       Called after middleware (optional), with match status
   */
  async execute (
    b: State,
    middleware: Middleware,
    done: IDone = () => null
  ) {
    if (!b.matched || this.force) {
      this.match = await Promise.resolve(this.matcher(b.message))
      this.matched = (this.match) ? true : false
      if (this.matched) {
        b.setMatchingBranch(this)
        await middleware.execute(b, (b) => {
          logger.debug(`[branch] executing ${this.constructor.name} callback, ID ${this.id}`)
          return Promise.resolve(this.callback(b))
        }).then(() => {
          logger.debug(`[branch] ${this.id} execute done (${(this.matched) ? 'matched' : 'no match'})`)
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
export class CatchAllBranch extends Branch {
  processKey: ProcessKeys = 'act'

  /** Accepts only super args, matcher is fixed */
  constructor (action: action, options?: IBranch) {
    super(action, options)
  }

  /** Matching function looks for any CatchAll */
  async matcher (msg: Message) {
    if (msg instanceof CatchAllMessage) {
      logger.debug(`[branch] message "${msg}" matched catch all ID ${this.id}`)
      return msg
    }
    return undefined
  }
}

/** Custom branch using unique matching function */
export class CustomBranch extends Branch {
  /** Accepts custom function to test message */
  constructor (
    public customMatcher: IMatcher,
    action: action,
    options?: IBranch
  ) {
    super(action, options)
  }

  /** Standard matcher method routes to custom matching function */
  async matcher (msg: Message) {
    const match = await Promise.resolve(this.customMatcher(msg))
    if (match) {
      logger.debug(`[branch] message "${msg}" matched custom branch ID ${this.id}`)
    }
    return match
  }
}

/** Text branch uses basic regex matching */
export class TextBranch extends Branch {
  processKey: ProcessKeys = 'listen'
  conditions: Conditions

  /** Create text branch for regex pattern */
  constructor (
    input: Conditions | ConditionInput,
    callback: action,
    options?: IBranch
  ) {
    super(callback, options)
    try {
      this.conditions = (input instanceof Conditions)
        ? input
        : new Conditions(input)
    } catch (err) {
      logger.error(`[branch] failed creating branch with input: ${JSON.stringify(input)}: \n${err.stack}`)
      throw err
    }
  }

  /**
   * Match message text against regex or composite conditions.
   * Resolves with either single match result or cumulative condition success.
   */
  async matcher (msg: Message) {
    this.conditions.exec(msg.toString())
    const match = this.conditions.match
    if (match) {
      logger.debug(`[branch] message "${msg.toString()}" matched branch ${this.id} conditions`)
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
export class TextDirectBranch extends TextBranch {
  processKey: ProcessKeys = 'listen'

  async matcher (msg: TextMessage) {
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
export class NLUBranch extends Branch {
  processKey: ProcessKeys = 'understand'
  match: NLUResultsRaw | undefined

  /** Create natural language branch for NLU matching. */
  constructor (
    public criteria: NLUCriteria,
    callback: action,
    options?: IBranch
  ) {
    super(callback, options)
  }

  /** Match on message's NLU attributes */
  async matcher (msg: TextMessage) {
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
export class NLUDirectBranch extends NLUBranch {
  processKey: ProcessKeys = 'understand'

  async matcher (msg: TextMessage) {
    if (directPattern().exec(msg.toString())) {
      return super.matcher(msg)
    } else {
      return undefined
    }
  }
}

/** Wild card object for validating any key/value data at path. */
export interface IServerBranchCriteria {
  [path: string]: any
}

/** Server branch matches data in a message received on the server. */
export class ServerBranch extends Branch {
  processKey: ProcessKeys = 'serve'
  match: any

  /** Create server branch for data matching. */
  constructor (
    public criteria: IServerBranchCriteria,
    callback: action,
    options?: IBranch
  ) {
    super(callback, options)
  }

  /**
   * Match on any exact or regex values at path of key in criteria.
   * Will also match on empty data if criteria is an empty object.
   */
  async matcher (msg: ServerMessage) {
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

/** Interface for collections of thought process branches. */
export interface IBranches {
  listen?: { [id: string]: TextBranch | CustomBranch }
  understand?: { [id: string]: NLUBranch | CustomBranch }
  serve?: { [id: string]: ServerBranch | CustomBranch }
  act?: { [id: string]: CatchAllBranch }
}

/** Creates and collects branches for each thought process. */
export class BranchController implements IBranches {
  listen: { [id: string]: TextBranch | CustomBranch }
  understand: { [id: string]: NLUBranch | CustomBranch }
  serve: { [id: string]: ServerBranch | CustomBranch }
  act: { [id: string]: CatchAllBranch }

  /** Create branch controller (branches can be cloned, created or empty). */
  constructor (init: BranchController | IBranches = {}) {
    this.listen = (init.listen)
      ? Object.assign({}, init.listen)
      : {}
    this.understand = (init.understand)
      ? Object.assign({}, init.understand)
      : {}
    this.serve = (init.serve)
      ? Object.assign({}, init.serve)
      : {}
    this.act = (init.act)
      ? Object.assign({}, init.act)
      : {}
  }

  /** Check if any branches have been added. */
  exist (type?: ProcessKeys) {
    if (type) return (Object.keys(this[type]).length)
    if (Object.keys(this.listen).length) return true
    if (Object.keys(this.understand).length) return true
    if (Object.keys(this.serve).length) return true
    if (Object.keys(this.act).length) return true
    return false
  }

  /** Remove all but forced branches from process, return remaining size. */
  forced (processKey: ProcessKeys) {
    for (let id in this[processKey]) {
      if (!this[processKey][id].force) delete this[processKey][id]
    }
    return Object.keys(this[processKey]).length
  }

  /** Add branch to thought process by it's class default or given key. */
  add (branch: Branch, processKey?: ProcessKeys) {
    if (!processKey) processKey = branch.processKey
    this[processKey][branch.id] = branch
    return branch.id
  }

  /** Empty thought process branch collections. */
  reset () {
    for (let key in ProcessKey) {
      if (isNaN(Number(key))) this[key as ProcessKeys] = {}
    }
  }

  /** Create text branch with provided regex, action and options */
  text (
    condition: ConditionInput,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new TextBranch(condition, action, atts))
  }

  /** Create text branch pre-matched on the bot name as prefix. */
  direct (
    condition: ConditionInput,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new TextDirectBranch(condition, action, atts))
  }

  /** Create custom branch with provided matcher, action and optional meta. */
  custom (
    matcher: IMatcher,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new CustomBranch(matcher, action, atts), 'listen')
  }

  /** Create a branch that triggers when no other branch matches. */
  catchAll (
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new CatchAllBranch(action, atts))
  }

  /** Create a natural language branch to match on NLU result attributes. */
  NLU (
    criteria: NLUCriteria,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new NLUBranch(criteria, action, atts))
  }

  /** Create a natural language branch pre-matched on the bot name as prefix. */
  directNLU (
    criteria: NLUCriteria,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new NLUDirectBranch(criteria, action, atts))
  }

  /** Create a natural language branch with custom matcher. */
  customNLU (
    matcher: IMatcher,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new CustomBranch(matcher, action, atts), 'understand')
  }

  /** Create a branch that triggers when user joins a room. */
  enter (
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.custom((msg: Message) => {
      return msg instanceof EnterMessage
    }, action, atts)
  }

  /** Create a branch that triggers when user leaves a room. */
  leave (
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.custom((msg: Message) => {
      return msg instanceof LeaveMessage
    }, action, atts)
  }

  /** Create a branch that triggers when user changes the topic. */
  topic (
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.custom((msg: Message) => {
      return msg instanceof TopicMessage
    }, action, atts)
  }

  /** Create a branch that triggers when server message matches criteria. */
  server (
    criteria: IServerBranchCriteria,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new ServerBranch(criteria, action, atts))
  }

  /** Create a server branch with custom matcher. */
  customServer (
    matcher: IMatcher,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(new CustomBranch(matcher, action, atts), 'serve')
  }
}

export const branches = new BranchController()

export default branches
