import * as bot from '..'

/** Collection interface for path containing sets of branches. */
export interface IPath {
  listen?: { [id: string]: bot.TextBranch | bot.CustomBranch }
  understand?: { [id: string]: bot.NaturalLanguageBranch | bot.CustomBranch }
  serve?: { [id: string]: bot.ServerBranch | bot.CustomBranch }
  act?: { [id: string]: bot.CatchAllBranch }
}

/** Path contains collections of branches and methods to create each type. */
export class Path implements IPath {
  listen: { [id: string]: bot.TextBranch | bot.CustomBranch }
  understand: { [id: string]: bot.NaturalLanguageBranch | bot.CustomBranch }
  serve: { [id: string]: bot.ServerBranch | bot.CustomBranch }
  act: { [id: string]: bot.CatchAllBranch }
  clock?: NodeJS.Timer

  constructor (init: Path | IPath = {}) {
    this.listen = (init.listen) ? Object.assign({}, init.listen) : {}
    this.understand = (init.understand) ? Object.assign({}, init.understand) : {}
    this.serve = (init.serve) ? Object.assign({}, init.serve) : {}
    this.act = (init.act) ? Object.assign({}, init.act) : {}
  }

  /** Check if any branches have been added to the path. */
  hasBranches () {
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
  add (branch: bot.Branch, collection: 'listen' | 'understand' | 'act' | 'serve') {
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
    condition: string | RegExp | bot.Condition | bot.Condition[] | bot.ConditionCollection | bot.Conditions,
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.TextBranch(condition, action, options),
      'listen'
    )
  }

  /** Create text branch pre-matched on the bot name as prefix. */
  direct (
    condition: string | RegExp | bot.Condition | bot.Condition[] | bot.ConditionCollection | bot.Conditions,
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.TextDirectBranch(condition, action, options),
      'listen'
    )
  }

  /** Create custom branch with provided matcher, action and optional meta. */
  custom (
    matcher: bot.IMatcher,
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.CustomBranch(matcher, action, options),
      'listen'
    )
  }

  /** Create a branch that triggers when no other branch matches. */
  catchAll (
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.CatchAllBranch(action, options),
      'act'
    )
  }

  /** Create a natural language branch to match on NLU result attributes. */
  NLU (
    criteria: bot.NaturalLanguageCriteria,
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.NaturalLanguageBranch(criteria, action, options),
      'understand'
    )
  }

  /** Create a natural language branch pre-matched on the bot name as prefix. */
  directNLU (
    criteria: bot.NaturalLanguageCriteria,
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.NaturalLanguageDirectBranch(criteria, action, options),
      'understand'
    )
  }

  /** Create a natural language branch with custom matcher. */
  customNLU (
    matcher: bot.IMatcher,
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.CustomBranch(matcher, action, options),
      'understand'
    )
  }

  /** Create a branch that triggers when user joins a room. */
  join (action: bot.IStateCallback | string, options?: bot.IBranch) {
    return this.custom((message: bot.Message) => {
      return message instanceof bot.EnterMessage
    }, action, options)
  }

  /** @deprecated enter replaced with join to avoid confusion with dialogue. */
  enter (action: bot.IStateCallback | string, options?: bot.IBranch) {
    return this.join(action, options)
  }

  /** Create a branch that triggers when user leaves a room. */
  leave (action: bot.IStateCallback | string, options?: bot.IBranch) {
    return this.custom((message: bot.Message) => {
      return message instanceof bot.LeaveMessage
    }, action, options)
  }

  /** Create a branch that triggers when user changes the topic. */
  topic (action: bot.IStateCallback | string, options?: bot.IBranch) {
    return this.custom((message: bot.Message) => {
      return message instanceof bot.TopicMessage
    }, action, options)
  }

  /** Create a branch that triggers when server message matches criteria. */
  server (
    criteria: bot.IServerBranchCriteria,
    action: bot.IStateCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.ServerBranch(criteria, action, options),
      'serve'
    )
  }
}

/** Global path to process any state not within specific isolated context. */
export const path = new Path()

/** @deprecated global is now just called path, is "global" as bot attribute. */
export const global = path
