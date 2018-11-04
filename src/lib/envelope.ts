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
  payload?: bot.IPayload | any
  branchId?: string
  responded?: number
}

/**
 * Envelopes are the outgoing equivalent of a message. They can be created to
 * respond to a received message, or initialised to send unprompted by input.
 * The envelope contains address details and the content (strings or payload)
 * for a variety of response methods through the message adapter.
 * Helpers provide simple interface for adding strings and attachments, but the
 * payload property can be used to access additional helpers for rich content.
 */
export class Envelope implements IEnvelope {
  id: string = bot.id.random()
  method: string = 'send'
  room: {
    id?: string
    name?: string
    type?: string
  } = {}
  user?: bot.User
  message?: bot.Message
  strings?: string[]
  branchId?: string
  responded?: number
  _payload?: bot.Payload

  /**
   * Create an envelope to dispatch unprompted or from a branch callback.
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
      if (options.payload) this._payload = new bot.Payload(options.payload)
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

  /** Accessor for payload instance creates if it doesn't exist */
  get payload () {
    if (!this._payload) this._payload = new bot.Payload()
    return this._payload
  }

  /** Add multi-media attachments to a message via payload handlers */
  attach (attachment: bot.IAttachment) {
    this.payload.attachment(attachment)
    return this
  }

  /** Helper for attaching or writing depending on a dynamic array of items */
  compose (...content: Array<string | bot.IAttachment>) {
    for (let part of content) {
      if (typeof part === 'string') this.write(part)
      else this.attach(part)
    }
    return this
  }

  /** Helper to set the method to be used by message adapter to respond/send */
  via (method: string) {
    this.method = method
    return this
  }
}
