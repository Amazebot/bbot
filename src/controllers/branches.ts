import { ConditionInput } from '../components/condition'
import { ICallback } from '../components/state'
import { NLUCriteria } from '../components/nlu'
import {
  Message,
  EnterMessage,
  LeaveMessage,
  TopicMessage
} from '../components/message'
import {
  TextBranch,
  CustomBranch,
  NLUBranch,
  ServerBranch,
  CatchAllBranch,
  Branch,
  IBranch,
  TextDirectBranch,
  IMatcher,
  NLUDirectBranch,
  IServerBranchCriteria
} from '../components/branch'

/**
 * @module Branches
 * Contains collections of branches and methods to create each type.
 */

/** Collection interface for containing sets of branches. */
export interface IBranches {
  listen?: { [id: string]: TextBranch | CustomBranch }
  understand?: { [id: string]: NLUBranch | CustomBranch }
  serve?: { [id: string]: ServerBranch | CustomBranch }
  act?: { [id: string]: CatchAllBranch }
}

/** Contains collections of branches and methods to create each type. */
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
  exist () {
    if (Object.keys(this.listen).length) return true
    if (Object.keys(this.understand).length) return true
    if (Object.keys(this.serve).length) return true
    if (Object.keys(this.act).length) return true
    return false
  }

  /** Remove all but forced branches from collection, return remaining size. */
  forced (collection: 'listen' | 'understand' | 'act') {
    for (let id in this[collection]) {
      if (!this[collection][id].force) delete this[collection][id]
    }
    return Object.keys(this[collection]).length
  }

  /** Add branch to collection, for separation based on thought processes. */
  add (
    branch: Branch,
    collection: 'listen' | 'understand' | 'act' | 'serve'
  ) {
    this[collection][branch.id] = branch
    return branch.id
  }

  /** Reset path to initial empty branch collections */
  reset () {
    this.listen = {}
    this.understand = {}
    this.act = {}
  }

  /** Create text branch with provided regex, action and options */
  text (
    condition: ConditionInput,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(
      new TextBranch(condition, action, atts),
      'listen'
    )
  }

  /** Create text branch pre-matched on the bot name as prefix. */
  direct (
    condition: ConditionInput,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(
      new TextDirectBranch(condition, action, atts),
      'listen'
    )
  }

  /** Create custom branch with provided matcher, action and optional meta. */
  custom (
    matcher: IMatcher,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(
      new CustomBranch(matcher, action, atts),
      'listen'
    )
  }

  /** Create a branch that triggers when no other branch matches. */
  catchAll (
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(
      new CatchAllBranch(action, atts),
      'act'
    )
  }

  /** Create a natural language branch to match on NLU result attributes. */
  NLU (
    criteria: NLUCriteria,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(
      new NLUBranch(criteria, action, atts),
      'understand'
    )
  }

  /** Create a natural language branch pre-matched on the bot name as prefix. */
  directNLU (
    criteria: NLUCriteria,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(
      new NLUDirectBranch(criteria, action, atts),
      'understand'
    )
  }

  /** Create a natural language branch with custom matcher. */
  customNLU (
    matcher: IMatcher,
    action: ICallback | string,
    atts?: IBranch
  ) {
    return this.add(
      new CustomBranch(matcher, action, atts),
      'understand'
    )
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
    return this.add(
      new ServerBranch(criteria, action, atts),
      'serve'
    )
  }
}

export const branches = new BranchController()

export default branches
