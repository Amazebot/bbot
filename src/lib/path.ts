import * as bot from '..'

/** Collection interface for path containing sets of branches. */
export interface IPath {
  scope?: string
  listen?: { [id: string]: bot.TextBranch | bot.CustomBranch }
  understand?: { [id: string]: bot.NaturalLanguageBranch | bot.CustomBranch }
  act?: { [id: string]: bot.CatchAllBranch }
}

/** Path contains collections of branches and methods to create each type. */
export class Path implements IPath {
  scope: string
  listen: { [id: string]: bot.TextBranch | bot.CustomBranch }
  understand: { [id: string]: bot.NaturalLanguageBranch | bot.CustomBranch }
  act: { [id: string]: bot.CatchAllBranch }

  constructor (init: Path | IPath = {}) {
    this.scope = (init.scope) ? init.scope : 'global'
    this.listen = (init.listen) ? init.listen : {}
    this.understand = (init.understand) ? init.understand : {}
    this.act = (init.act) ? init.act : {}
  }

  /** Remove all but forced branches from collection, return remaining size. */
  forced (collection: 'listen' | 'understand' | 'act') {
    for (let id in this[collection]) {
      if (!this[collection][id].force) delete this[collection][id]
    }
    return Object.keys(this[collection]).length
  }

  /** Add branch to collection, for separation based on thought processes. */
  add (branch: bot.Branch, collection: 'listen' | 'understand' | 'act') {
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
    action: bot.IBranchCallback | string,
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
    action: bot.IBranchCallback | string,
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
    action: bot.IBranchCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.CustomBranch(matcher, action, options),
      'listen'
    )
  }

  /** Create a branch that triggers when no other branch matches. */
  catchAll (
    action: bot.IBranchCallback | string,
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
    action: bot.IBranchCallback | string,
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
    action: bot.IBranchCallback | string,
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
    action: bot.IBranchCallback | string,
    options?: bot.IBranch
  ) {
    return this.add(
      new bot.CustomBranch(matcher, action, options),
      'understand'
    )
  }

  /** Create a branch that triggers when user enters a room. */
  enter (action: bot.IBranchCallback | string, options?: bot.IBranch) {
    return this.custom((message: bot.Message) => {
      return message instanceof bot.EnterMessage
    }, action, options)
  }

  /** Create a branch that triggers when user leaves a room. */
  leave (action: bot.IBranchCallback | string, options?: bot.IBranch) {
    return this.custom((message: bot.Message) => {
      return message instanceof bot.LeaveMessage
    }, action, options)
  }

  /** Create a branch that triggers when user changes the topic. */
  topic (action: bot.IBranchCallback | string, options?: bot.IBranch) {
    return this.custom((message: bot.Message) => {
      return message instanceof bot.TopicMessage
    }, action, options)
  }
}

/** Global path to process any state not within specific isolated context. */
export const global = new Path()
