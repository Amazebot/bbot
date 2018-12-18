import * as branch from '../components/branch'
import * as condition from '../components/condition'
import * as state from '../components/state'
import * as message from '../components/message'
import * as nlu from '../components/nlu'

/**
 * @module Branches
 * Contains collections of branches and methods to create each type.
 */

/** Collection interface for containing sets of branches. */
export interface IBranches {
  listen?: { [id: string]: branch.Text | branch.Custom }
  understand?: { [id: string]: branch.NLU | branch.Custom }
  serve?: { [id: string]: branch.Server | branch.Custom }
  act?: { [id: string]: branch.CatchAll }
}

/** Contains collections of branches and methods to create each type. */
export class BranchController implements IBranches {
  listen: { [id: string]: branch.Text | branch.Custom }
  understand: { [id: string]: branch.NLU | branch.Custom }
  serve: { [id: string]: branch.Server | branch.Custom }
  act: { [id: string]: branch.CatchAll }

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
    branch: branch.Branch,
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
    condition: condition.input,
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.Text(condition, action, options),
      'listen'
    )
  }

  /** Create text branch pre-matched on the bot name as prefix. */
  direct (
    condition: condition.input,
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.TextDirect(condition, action, options),
      'listen'
    )
  }

  /** Create custom branch with provided matcher, action and optional meta. */
  custom (
    matcher: branch.IMatcher,
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.Custom(matcher, action, options),
      'listen'
    )
  }

  /** Create a branch that triggers when no other branch matches. */
  catchAll (
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.CatchAll(action, options),
      'act'
    )
  }

  /** Create a natural language branch to match on NLU result attributes. */
  NLU (
    criteria: nlu.Criteria,
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.NLU(criteria, action, options),
      'understand'
    )
  }

  /** Create a natural language branch pre-matched on the bot name as prefix. */
  directNLU (
    criteria: nlu.Criteria,
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.NLUDirect(criteria, action, options),
      'understand'
    )
  }

  /** Create a natural language branch with custom matcher. */
  customNLU (
    matcher: branch.IMatcher,
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.Custom(matcher, action, options),
      'understand'
    )
  }

  /** Create a branch that triggers when user joins a room. */
  enter (
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.custom((msg: message.Message) => {
      return msg instanceof message.Enter
    }, action, options)
  }

  /** Create a branch that triggers when user leaves a room. */
  leave (
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.custom((msg: message.Message) => {
      return msg instanceof message.Leave
    }, action, options)
  }

  /** Create a branch that triggers when user changes the topic. */
  topic (
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.custom((msg: message.Message) => {
      return msg instanceof message.Topic
    }, action, options)
  }

  /** Create a branch that triggers when server message matches criteria. */
  server (
    criteria: branch.IServerCriteria,
    action: state.ICallback | string,
    options?: branch.IOptions
  ) {
    return this.add(
      new branch.Server(criteria, action, options),
      'serve'
    )
  }
}

export const branches = new BranchController()

export default branches
