import * as bot from '..'

/** Envelope interface, to create from scratch. */
export interface IEnvelope {
  method?: string
  room?: {
    id?: string
    name?: string
  }
  user?: bot.User
  strings?: string[]
  payload?: any
  listenerId?: string
  responded?: number
}

/**
 * Envelopes are the outgoing equivalent of a message. They can be created to
 * respond to a received message, or initialised to send unprompted by input.
 * The envelope contains address details and the content (strings or payload
 * data) for a variety of response methods through the message adapter.
 */
export class Envelope implements IEnvelope {
  id: string = bot.random()
  method: string = 'send'
  room: {
    id?: string
    name?: string
    type?: string
  } = {}
  user?: bot.User
  message?: bot.Message
  strings?: string[]
  payload?: any
  listenerId?: string
  responded?: number

  /**
   * Create an envelope to dispatch unprompted or from a listener callback.
   * - Addresses to a message's origin from a processed state if given
   * - Provide address and content as options (overriding those in state)
   * - Address to user's room if user given. If room given, will override user
   */
  constructor (options?: IEnvelope, b?: bot.State) {
    if (b) {
      this.message = b.message
      this.user = b.message.user
      this.room = b.message.user.room
    }
    if (options) {
      if (options.user) this.user = options.user
      if (options.room) this.room = options.room
      else if (options.user) this.room = options.user.room
      if (options.strings) this.strings = options.strings
      if (options.payload) this.payload = options.payload
      if (options.method) this.method = options.method
    }
  }

  /** Set room ID attribute, clear room name so adapter will use ID  */
  toRoomId (id: string) {
    this.room.id = id
    delete this.room.name
    return this
  }

  /** Set room name attribute, clear room ID so adapter will use name */
  toRoomName (name: string) {
    this.room.name = name
    delete this.room.id
    return this
  }

  /** Set user attribute, overwrites room if user has room attribute */
  toUser (user: bot.User) {
    this.user = user
    if (this.user.room) this.room = this.user.room
    return this
  }

  /** Add string content to an envelope, could be message text or reaction */
  write (...strings: string[]) {
    if (!this.strings) this.strings = []
    this.strings = this.strings.concat(strings)
    return this
  }

  /** Add multi-media attachments to a message, could be buttons or files etc */
  attach (payload: any) {
    if (!this.payload) this.payload = {}
    Object.assign(this.payload, payload)
    return this
  }

  /** Helper for attaching or writing depending on a dynamic array of items */
  compose (...content: any[]) {
    for (let part of content) {
      if (typeof part === 'string') this.write(part)
      else if (typeof part === 'object') this.attach(part)
      else bot.logger.error(`[envelope] unrecognised content: ${part}`)
    }
    return this
  }

  /** Helper to set the method to be used by message adapter to respond/send */
  via (method: string) {
    this.method = method
    return this
  }
}
