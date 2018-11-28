import { logger, id, user, nlu } from '.'

export namespace message {
  /** Represents an incoming message from the chat. */
  export abstract class Message {
    id: string
    user: user.User
    nlu?: nlu.NLU

    /**
     * Create a message.
     * @param user The sender's user instance (or properties to create it)
     * @param id   A unique ID for the message
     */
    constructor (usr: user.IOptions, mId: string = id.random()) {
      this.id = mId
      this.user = (usr instanceof user.User) ? usr : user.create(user)
    }

    /** String representation of the message. */
    abstract toString (): string

    /** Return a copy of message to alter without effecting original */
    clone () {
      return Object.assign(Object.create(this), this)
    }
  }

  /** An empty message for outgoings without original input */
  export class Blank extends Message {
    constructor () { super(user.blank()) }
    toString () { return '' }
  }

  /** Create a blank message */
  export const blank = () => new Blank()

  /** A plain text/string message type. */
  export class Text extends Message {
    /**
     * Create a text message.
     * @param user The user who sent the message
     * @param text The user who sent the message
     * @param id   A unique ID for the message
     */
    constructor (user: user.User, public text: string, id?: string) {
      super(user, id)
    }

    toString () {
      return this.text
    }
  }

  /** Create a text message. */
  export const text = (user: user.User, text: string, id?: string) => {
    return new Text(user, text, id)
  }

  /** A message containing payload attributes from messaging platform. */
  export class Rich extends Message {

    /**
     * Create a rich message.
     * @param user    The user who sent the message
     * @param payload The payload to attach
     * @param id      A unique ID for the message
     */
    constructor (user: user.User, public payload: any, id?: string) {
      super(user, id)
    }

    toString () {
      return JSON.stringify(this.payload)
    }
  }

  /** Create a rich message. */
  export const rich = (user: user.User, payload: any, id?: string) => {
    return new Rich(user, payload, id)
  }

  /** Represent an incoming event notification. */
  export abstract class Event extends Message {
    abstract event: string
    toString () {
      return `${this.event} message for ${this.user.name}`
    }
  }

  /** Represent a room enter event for a user. */
  export class Enter extends Event {
    event = 'enter'
  }

  /** Create an enter event message. */
  export const enter = (user: user.User, id?: string) => new Enter(user, id)

  /** Represent a room leave event for a user. */
  export class Leave extends Event {
    event = 'leave'
  }

  /** Create a leave event message. */
  export const leave = (user: user.User, id?: string) => new Leave(user, id)

  /** Represent a topic change event from a user. */
  export class Topic extends Event {
    event = 'topic'
  }

  /** Create a topic event message. */
  export const topic = (user: user.User, id?: string) => new Topic(user, id)

  /** JSON data for server request event message. */
  export interface IServerOptions {
    userId: string  // The user the request relates to
    roomId?: string // The room to message the user from
    data?: any      // Any data to be used by callbacks
    id?: string     // ID for the message
  }

  /** Represent message data coming from a server request. */
  export class Server extends Event {
    event = 'request'
    data: any

    /** Create a server message for a user. */
    constructor (options: IServerOptions) {
      super(
        user.byId(options.userId, {
          room: (options.roomId) ? { room: { id: options.roomId } } : undefined
        }),
        options.id
      )
      this.data = options.data || {}
      logger.debug(`[message] server request keys: ${Object.keys(this.data).join(', ')}`)
    }

    toString () {
      return `Data for user ${this.user.id}: ${JSON.stringify(this.data)}`
    }
  }

  /** Create a server request message. */
  export const server = (options: IServerOptions) => new Server(options)

  /** Represent a message where nothing matched. */
  export class CatchAll extends Message {
    constructor (public message: Message) {
      super(message.user, message.id)
    }

    toString () {
      return this.message.toString()
    }
  }

  /** Create a catch all message. */
  export const catchAll = (message: Message) => new CatchAll(message)
}
