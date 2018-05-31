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
 */
export class B implements IState {
  bot = bot
  done: boolean = false
  message: bot.Message
  listener: bot.Listener
  match?: any
  matched?: boolean
  method?: string
  envelope?: bot.Envelope
  heard?: number
  listened?: number
  responded?: number
  remembered?: number
  [key: string]: any

  /** Create new state, usually assigned as `b` in middleware callbacks. */
  constructor (startingState: IState) {
    // Manual assignment of required keys is just a workaround for type checking
    this.message = startingState.message
    this.listener = startingState.listener
    for (let key in startingState) this[key] = startingState[key]
  }

  /** Indicate that no other listener should be called for the state */
  finish () {
    this.done = true
    return this
  }

  /** Proxy for adding payload to envelope, creates if envelope doesn't exist */
  attach (payload: any) {
    if (!this.envelope) this.envelope = bot.responseEnvelope(this)
    this.envelope.attach(payload)
    return this
  }

  /** Proxy for adding strings to envelope, creates if envelope doesn't exist */
  write (...strings: string[]) {
    if (!this.envelope) this.envelope = bot.responseEnvelope(this)
    this.envelope.write(...strings)
    return this
  }

  /** Helper for attaching or writing depending on a dynamic array of items */
  compose (content?: any[]) {
    if (content) {
      for (let part of content) {
        if (typeof part === 'string') this.write(part)
        else if (typeof part === 'object') this.attach(part)
        else bot.logger.error(`Unrecognised content for enveloper: ${part}`)
      }
    }
    return this
  }

  /** Issues the response to the message adapter by whatever method is given */
  async respond (method: string = 'send', callback?: bot.ICallback) {
    if (method) this.method = method
    await bot.respond(this, callback)
  }
}
