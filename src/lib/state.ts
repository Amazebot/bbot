import * as bot from '..'

/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of listener or middleware.
 * The `done` property tells middleware not to continue processing state.
 */
export interface IState {
  done?: boolean
  exit?: boolean
  sequence?: string
  scope?: string
  [key: string]: any
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
  listeners?: bot.Listener[]
  envelopes?: bot.Envelope[]
  sequence?: string
  scope?: string
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

  /** Indicate that no more thought processes should look at this state */
  ignore () {
    bot.logger.debug(`[state] ignored by further thought processes`)
    this.exit = true
    return this
  }

  /** Indicate that no other listener should be called for the state */
  finish () {
    this.done = true
    return this
  }

  /** Add to or create collection of matched listeners */
  setListener (listener: bot.Listener) {
    if (!listener.matched) return
    if (!this.listeners) this.listeners = []
    this.listeners.push(listener)
  }

  /** Get a matched listener by it's ID or index (or last matched) */
  getListener (id?: number | string) {
    if (!this.listeners) return undefined
    if (!id) id = this.listeners.length - 1
    return (typeof id === 'number' && this.listeners.length > id)
      ? this.listeners[id]
      : this.listeners.find((listener) => listener.id === id)
  }

  /**
   * Use property getter for last listener match (often the only match).
   * In the context of a listener callback, this provides a shorthand to the
   * listener that was just matched, as opposed to `b.getListener(id).match`.
   */
  get match () {
    const listener = this.getListener()
    if (listener) return listener.match
  }

  /** Use property getting for match state (only matched listeners are kept) */
  get matched () {
    return (this.listeners && this.listeners.length) ? true : false
  }

  /** Check for existing envelope without response */
  pendingEnvelope () {
    if (!this.envelopes) return
    return this.envelopes.find((e) => typeof e.responded === 'undefined')
  }

  /** Return the last dispatched envelope */
  dispatchedEnvelope () {
    if (!this.envelopes) return
    return this.envelopes.find((e) => typeof e.responded !== 'undefined')
  }

  /** Create or return pending envelope, to respond to incoming message */
  respondEnvelope (options?: bot.IEnvelope) {
    let pending = this.pendingEnvelope()
    if (!pending) {
      if (!this.envelopes) this.envelopes = []
      pending = new bot.Envelope(options, this)
      this.envelopes.push(pending)
    }
    return pending
  }

  /** Dispatch the envelope via respond thought process */
  respond (...content: any[]) {
    this.respondEnvelope().compose(...content)
    return bot.respond(this)
  }

  /** Set method for dispatching envelope responding to state */
  respondVia (method: string, ...content: any[]) {
    this.respondEnvelope().via(method)
    return this.respond(...content)
  }
}
