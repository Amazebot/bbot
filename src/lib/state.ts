import * as bot from '..'

/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of branch or middleware.
 * The `done` property tells middleware not to continue processing state.
 */
export interface IState {
  done?: boolean
  exit?: boolean
  sequence?: string
  branch?: bot.Branch
  dialogue?: bot.dialogue.Dialogue
  server?: bot.IServerContext
  [key: string]: any
}

/** State callback interface, usually for branch if the message matched. */
export interface IStateCallback {
  (b: bot.State): any
}

/**
 * Received states persist the incoming message to be used for matching and
 * to address response envelopes.
 */
export interface IReceiveState extends IState {
  message: bot.Message
}

/**
 * Dispatching states don't have an originating message, so they will be
 * processed via the attributes of the outgoing envelope/s.
 */
export interface IDispatchState extends IState {
  envelopes?: bot.Envelope[]
}

/**
 * Generic state, starting point for outgoing dispatches
 * States have access to all bBot modules from the bot property.
 * It has defined properties but can be extended with any key/value pair.
 * Each thought process attaches timestamps if they are actioned.
 * Provides proxies to envelope messages, so responses can be easily actioned.
 */
export class State implements IState {
  bot = bot
  done: boolean = false
  processed: { [key: string]: number } = {}
  message: bot.Message = new bot.NullMessage()
  branches?: bot.Branch[]
  dialogue?: bot.dialogue.Dialogue
  envelopes?: bot.Envelope[]
  sequence?: string
  method?: string
  exit?: boolean
  [key: string]: any

  /** Create new state, usually assigned as `b` in middleware callbacks. */
  constructor (startingState: IDispatchState) {
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
    bot.logger.debug(`[state] ignored by further thought processes`)
    this.exit = true
    return this
  }

  /** Indicate that no other branch should process this state. */
  finish () {
    this.done = true
    return this
  }

  /** Add to or create collection of matched branches. */
  setBranch (branch: bot.Branch) {
    if (!branch.matched) return
    if (!this.branches) this.branches = []
    this.branches.push(branch)
  }

  /** Add to the branches collection form the branch property. */
  set branch (branch: bot.Branch | undefined) {
    if (branch) this.setBranch(branch)
  }

  /** Get a matched branch by it's ID or index (or last matched). */
  getBranch (id?: number | string) {
    if (!this.branches) return undefined
    if (!id) id = this.branches.length - 1
    return (typeof id === 'number' && this.branches.length > id)
      ? this.branches[id]
      : this.branches.find((branch) => branch.id === id)
  }

  /** Provide path from current or new dialogue. */
  get path () {
    if (!this.dialogue) {
      this.dialogue = bot.dialogue.create()
      this.dialogue.open(this)
    }
    return this.dialogue.path
  }

  /** Provide the last matched branch as an property. */
  get branch () {
    return this.getBranch()
  }

  /**
   * Use property getter for last branch match (often the only match).
   * In the context of a branch callback, this provides a shorthand to the
   * branch that was just matched, as opposed to `b.getBranch(id).match`.
   */
  get match () {
    const branch = this.getBranch()
    if (branch) return branch.match
  }

  /** Get the conditions of the last matched branch. */
  get conditions () {
    const branch = this.getBranch()
    if (branch && branch.conditions) return branch.conditions
  }

  /** Use property getting for match state (only matched branches are kept). */
  get matched () {
    return (this.branches && this.branches.length) ? true : false
  }

  /** Check for existing envelope without response. */
  pendingEnvelope () {
    if (!this.envelopes) return
    return this.envelopes.find((e) => typeof e.responded === 'undefined')
  }

  /** Access user from memory matching message details */
  get user () {
    const user = this.message.user
    return bot.userById(user.id, user)
  }

  /** Return the last dispatched envelope. */
  dispatchedEnvelope () {
    if (!this.envelopes) return
    return this.envelopes.find((e) => typeof e.responded !== 'undefined')
  }

  /** Create or return pending envelope, to respond to incoming message. */
  respondEnvelope (options?: bot.IEnvelope) {
    let pending = this.pendingEnvelope()
    if (!pending) {
      if (!this.envelopes) this.envelopes = []
      pending = new bot.Envelope(options, this)
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
    return bot.respond(this)
  }

  /** Set method for dispatching envelope responding to state. */
  respondVia (method: string, ...content: any[]) {
    this.respondEnvelope().via(method)
    return this.respond(...content)
  }
}
