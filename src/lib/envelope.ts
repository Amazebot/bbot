import { id, user, room, message, payload, state } from '.'

/** Create and dispatch envelopes (outgoing messages). */
export namespace envelope {

  /** Envelope interface, to create from scratch. */
  export interface IOptions {
    method?: string
    room?: room.Room
    user?: user.User
    strings?: string[]
    payload?: payload.IOptions | any
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
  export class Envelope implements IOptions {
    id: string = id.random()
    method: string = 'send'
    room: room.Room
    user: user.User
    message?: message.Message
    strings?: string[]
    branchId?: string
    responded?: number
    _payload?: payload.Payload

    /**
     * Create an envelope to dispatch unprompted or from a branch callback.
     * - Addresses to a message's origin from a processed state if given
     * - Provide address and content as options (overriding those in state)
     * - Address to user's room if user given. If room given, will override user
     */
    constructor (options?: IOptions, b?: state.State) {
      this.room = room.blank()
      this.user = user.blank()
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
        if (options.payload) this._payload = options.payload
        if (options.method) this.method = options.method
      }
    }

    /** Set room ID attribute, clear room name so adapter will use ID  */
    toRoomId (id: string) {
      this.room = room.byId(id)
      return this
    }

    /** Set user attribute, overwrites room if user has room attribute */
    toUser (usr: user.User) {
      this.user = user.byId(usr.id, usr)
      if (this.user.room) this.room = this.user.room
      return this
    }

    /** Add string content to an envelope, could be message text or reaction */
    write (...strings: string[]) {
      if (!this.strings) this.strings = []
      this.strings = this.strings.concat(strings)
      return this
    }

    /** Accessor for payload instance creates if it doesn't exist. */
    get payload (): payload.Payload {
      if (!this._payload) this._payload = payload.create()
      return this._payload
    }

    // /** Assign payload attributes as new payload instance. */
    // set payload (options: payload.IOptions): payload.Payload {
    //   this._payload = payload.create(options)
    //   return this._payload
    // }

    /** Add multi-media attachments to a message via payload handlers. */
    attach (attachment: payload.IAttachment) {
      this.payload.attachment(attachment)
      return this
    }

    /** Helper to attach or write depending on type of content. */
    compose (...content: Array<string | payload.IAttachment>) {
      for (let part of content) {
        if (typeof part === 'string') this.write(part)
        else this.attach(part)
      }
      return this
    }

    /** Set the method to be used by message adapter to respond. */
    via (method: string) {
      this.method = method
      return this
    }
  }

  /** Create an envelope */
  export const create = (options?: IOptions, b?: state.State) => {
    return new Envelope(options, b)
  }
}
