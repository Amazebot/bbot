import {
  IBranchProps,
  Branch,
  TextBranch,
  NLUBranch,
  ServerBranch,
  CatchAllBranch,
  CustomBranch
} from './class'
import { Action, ProcessKey, ProcessKeys } from './interface'
import { logger, counter } from '../../util'
import { State, IStateCallback } from '../state/class'
import { Conditions, ConditionsInput } from '../condition/class'
import { Middleware } from '../middleware/class'

/** Interface for collections of thought process branches. */
export interface IBranches {
  listen?: { [id: string]: TextBranch | CustomBranch }
  understand?: { [id: string]: NLUBranch | CustomBranch }
  serve?: { [id: string]: ServerBranch | CustomBranch }
  act?: { [id: string]: CatchAllBranch }
}

/** Creates and collects branches for each thought process. */
export class BranchController implements IBranches {
  listen: { [id: string]: TextBranch | CustomBranch } = {}
  understand: { [id: string]: NLUBranch | CustomBranch } = {}
  serve: { [id: string]: ServerBranch | CustomBranch } = {}
  act: { [id: string]: CatchAllBranch } = {}

  /** Create branch controller (branches can be cloned, created or empty). */
  constructor (private _: {
    newCondition: (input: ConditionInput) => Conditions
    runBit: (action: Action, state: State) => Promise<any>
    runMiddleware: (middleware: Middleware, b: State, cb: IStateCallback) => Promise<any>
  }) {}

  /** Populate branch collections for each thought process. */
  init ({ listen, understand, serve, act }: BranchController | IBranches) {
    if (listen) this.listen = Object.assign(this.listen, listen)
    if (understand) this.understand = Object.assign(this.understand, understand)
    if (serve) this.serve = Object.assign(this.serve, serve)
    if (act) this.act = Object.assign(this.act, act)
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

  /** Generate and/or return a callback for a branch action. */
  callback (action: Action) {
    return (typeof action === 'string')
      ? (state: State) => this._.runBit(action, state)
      : action
  }

  /**
   * Execute branch with message in state.
   * Run middleware and callback if matched.
   * Middleware can intercept and prevent the callback from executing.
   * If the state has already matched on prior branch, it will not match again
   * unless forced to, with the branch's `force` property.
   * @param b          State containing message to process
   * @param middleware Executes before the branch callback if matched
   * @param done       Called after middleware (optional), with match status
   */
  async execute (
    branch: Branch,
    b: State,
    middleware: Middleware,
    done: IDone = () => null
  ) {
    if (branch.test(b.message)) {
      b.setMatchingBranch(branch)
      await this._.runMiddleware(middleware, b, (b) => {
        logger.debug(`[branch] executing ${this.constructor.name} callback, ID ${branch.id}`)
        return Promise.resolve(this.callback(b))
      }).then(() => {
        logger.debug(`[branch] ${branch.id} execute done (${(branch.matched) ? 'matched' : 'no match'})`)
        return Promise.resolve(done(true))
      }).catch((err: Error) => {
        logger.error(`[branch] ${branch.id} middleware error, ${err.message}`)
        return Promise.resolve(done(false))
      })
    } else {
      await Promise.resolve(done(false))
    }
    return b
  }

  /** Create specified branch types. */
  create = {
    /** Create text branch with provided regex, action and properties */
    text: (
      input: ConditionsInput,
      action: Action,
      props?: IBranchProps
    ) => {
      try {
        const conditions = this._.newCondition(input)
        props = Object.assign({}, props, {
          id: counter('branch'),
          callback: this.callback(action)
        })
        return this.add(new TextBranch({ conditions, ...props }))
      } catch (err) {
        logger.error(`[branch] failed creating text branch with input: ${JSON.stringify(input)}`)
        throw err
      }
    }
  }
}
