/**
 * Handle conversational content and responses.
 * @module components/state
 */

import logger from '../util/logger'
import { users } from './user'
import { IContext } from './server'
import { Branch } from './branch'
import { Dialogue } from './dialogue'
import { messages, Message } from './message'
import { Envelope, IEnvelope } from './envelope'
import { thoughts } from './thought'
import bBot from '../bot'

/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of branch or middleware.
 * The `done` property tells middleware not to continue processing state.
 */
export interface IState {
  done?: boolean
  exit?: boolean
  sequence?: string
  branch?: Branch
  dialogue?: Dialogue
  server?: IContext
  [key: string]: any
}

/** State callback interface, usually for branch if the message matched. */
export interface ICallback {
  (b: State): any
}

/**
 * Received states persist the incoming message to be used for matching and
 * to address response envelopes.
 */
export interface IReceiveState extends IState {
  message: Message
}

/**
 * Dispatching states don't have an originating message, so they will be
 * processed via the attributes of the outgoing envelope/s.
 */
export interface IDispatchState extends IState {
  envelopes?: Envelope[]
}

/**
 * Generic state, starting point for outgoing dispatches
 * States have access to all bBot modules from the bot property.
 * It has defined properties but can be extended with any key/value pair.
 * Each thought process attaches timestamps if they are actioned.
 * Provides proxies to envelope messages, so responses can be easily actioned.
 */
export class State implements IState {
  bot = bBot
  done: boolean = false
  processed: { [key: string]: number } = {}
  message: Message = messages.blank()
  matching?: Branch[]
  dialogue?: Dialogue
  envelopes?: Envelope[]
  sequence?: string
  method?: string
  exit?: boolean
  [key: string]: any

  /** Create new state, usually assigned as `b` in middleware callbacks. */
  constructor (startingState: IDispatchState = {}) {
    for (let key in startingState) this[key] = startingState[key]
  }

  /** Initialise a new state from this one's attribute. */
  clone () {
    return new State(this)
  }

  /** Get a pretty-printed view of the state without all the bot attributes. */
  inspect () {
    const clone = Object.assign({}, this)
    delete clone.bot
    return JSON.stringify(clone, null, 2)
  }

  /** Indicate that no more thought processes should look at this state. */
  ignore () {
    logger.debug(`[state] ignored by further thought processes`)
    this.exit = true
    return this
  }

  /** Indicate that no other branch should process this state. */
  finish () {
    this.done = true
    return this
  }

  /** Add to or create collection of matched branches. */
  setMatchingBranch (branch: Branch) {
    if (!branch.matched) return
    if (!this.matchingBranches) this.matchingBranches = []
    this.matchingBranches.push(branch)
  }

  /** Proxy to use setMatchingBranch as property */
  set matchingBranch (branch: Branch | undefined) {
    if (branch) this.setMatchingBranch(branch)
  }

  /** Get a matched branch by it's ID or index (or last matched). */
  getMatchingBranch (id?: number | string) {
    if (!this.matchingBranches) return undefined
    if (!id) id = this.matchingBranches.length - 1
    return (typeof id === 'number' && this.matchingBranches.length > id)
      ? this.matchingBranches[id]
      : this.matchingBranches.find((branch: Branch) => branch.id === id)
  }

  /** Proxy to use getMatchingBranch as property */
  get matchingBranch () {
    return this.getMatchingBranch()
  }

  /** Provide branches from current or new dialogue. */
  get branches () {
    if (!this.dialogue) this.dialogue = new Dialogue()
    this.dialogue.open(this)
      .catch((err) => {
        logger.error(`Error opening dialogue from state: ${err.message}`)
        throw err
      })
    return this.dialogue.branches
  }

  /**
   * Use property getter for last branch match (often the only match).
   * In the context of a branch callback, this provides a shorthand to the
   * branch that was just matched, as opposed to `b.getMatching(id).match`.
   */
  get match () {
    const branch = this.matchingBranch
    if (branch) return branch.match
  }

  /** Get the conditions of the last matched branch. */
  get conditions () {
    const branch = this.matchingBranch
    if (branch && branch.conditions) return branch.conditions
  }

  /** Use property getting for match state (only matched branches are kept). */
  get matched () {
    return (this.matchingBranches && this.matchingBranches.length) ? true : false
  }

  /** A strict version of matched, only true if not matched on act stage. */
  get resolved () {
    return (
      this.matched &&
      this.matchingBranch &&
      this.matchingBranch.processKey !== 'act'
    )
  }

  /** Check for existing envelope without response. */
  pendingEnvelope () {
    if (!this.envelopes) return
    return this.envelopes.find((e) => typeof e.responded === 'undefined')
  }

  /** Access user from memory matching message details */
  get user () {
    const user = this.message.user
    return users.byId(user.id, user)
  }

  /** Return the last dispatched envelope. */
  dispatchedEnvelope () {
    if (!this.envelopes) return
    return this.envelopes.find((e) => typeof e.responded !== 'undefined')
  }

  /** Create or return pending envelope, to respond to incoming message. */
  respondEnvelope (options?: IEnvelope) {
    let pending = this.pendingEnvelope()
    if (!pending) {
      if (!this.envelopes) this.envelopes = []
      pending = new Envelope(options, this)
      this.envelopes.push(pending)
    }
    return pending
  }

  /** Get an envelope for responding with, either pending or newly created. */
  get envelope () {
    return this.respondEnvelope()
  }

  /** Dispatch the envelope via respond thought process. */
  respond (...content: any[]) {
    this.respondEnvelope().compose(...content)
    return thoughts.respond(this)
  }

  /** Set method for dispatching envelope responding to state. */
  respondVia (method: string, ...content: any[]) {
    this.respondEnvelope().via(method)
    return this.respond(...content)
  }
}
