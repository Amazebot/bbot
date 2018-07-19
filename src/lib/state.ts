import * as bot from '..'

/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of listener or middleware.
 * Will always be created with at least a message object (can be empty).
 * The `done` property tells middleware not to continue processing state.
 */
export interface IState {
  message: bot.Message // the received message, persists in state for response
  method?: string // response type method (send, reply, emote, etc)
  envelope?: bot.Envelope // response envelope, address and content to send
  done?: boolean
  [key: string]: any
}

/**
 * B is a pseudonym for the internal state handled by the thought process.
 * States have access to all bBot modules from the bot property.
 * It has defined properties but can be extended with any key/value pair.
 * Each thought process attaches timestamps if they are actioned.
 * Provides proxies to envelope messages, so responses can be easily actioned.
 */
export class B implements IState {
  bot = bot
  done: boolean = false
  message: bot.Message
  listener: bot.Listener
  envelopes?: bot.Envelope[]
  match?: any
  matched?: boolean
  method?: string
  heard?: number
  listened?: number
  responded?: number
  remembered?: number
  [key: string]: any

  /** Create new state, usually assigned as `b` in middleware callbacks. */
  constructor (startingState: IState) {
    this.message = startingState.message
    this.listener = startingState.listener
    for (let key in startingState) this[key] = startingState[key]
  }

  /** Indicate that no other listener should be called for the state */
  finish () {
    this.done = true
    return this
  }

  /** Check for an envelope that hasn't been dispatched */
  pendingEnvelope () {
    if (!this.envelopes) return
    return this.envelopes.find((e) => typeof e.responded === 'undefined')
  }

  /** Create or return pending envelope, to respond to incoming message */
  respondEnvelope (options?: bot.IEnvelope) {
    let pending = this.pendingEnvelope()
    if (!pending) {
      pending = new bot.Envelope(options, this)
      if (!this.envelopes) this.envelopes = []
      this.envelopes.push(pending)
    }
    return pending
  }

  /** Dispatch the envelope via respond thought process */
  respond (...content: any[]): Promise<B> {
    this.respondEnvelope().compose(...content)
    return bot.thoughts.respond(this)
  }

  /** Set method for dispatching envelope responding to state */
  respondVia (method: string, ...content: any[]): Promise<B> {
    this.respondEnvelope().via(method)
    return this.respond(...content)
  }
}
