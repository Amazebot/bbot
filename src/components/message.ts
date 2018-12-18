import { random } from '../utils/id'
import logger from '../controllers/logger'
import users from '../controllers/users'
import { User, IUser } from './user'
import { NLU } from './nlu'
import { IPayload } from './payload'

/** Represents an incoming message from the chat. */
export abstract class Message {
  id: string
  user: User
  nlu?: NLU

  /**
   * Create a message.
   * @param user The sender's user instance (or properties to create it)
   * @param id   A unique ID for the message
   */
  constructor (usr: IUser, mId: string = random()) {
    this.id = mId
    this.user = (usr instanceof User) ? usr : users.create(usr)
  }

  /** String representation of the message. */
  abstract toString (): string

  /** Return a copy of message to alter without effecting original */
  clone () {
    return Object.assign(Object.create(this), this)
  }
}

/** An empty message for outgoings without original input */
export class BlankMessage extends Message {
  constructor () { super(users.blank()) }
  toString () { return '' }
}

/** A plain text/string message type. */
export class TextMessage extends Message {
  /**
   * Create a text message.
   * @param user The user who sent the message
   * @param text The user who sent the message
   * @param id   A unique ID for the message
   */
  constructor (user: User, public text: string, id?: string) {
    super(user, id)
  }

  toString () {
    return this.text
  }
}

/** A message containing payload attributes from messaging platform. */
export class RichMessage extends Message {

  /**
   * Create a rich message.
   * @param user    The user who sent the message
   * @param payload The payload to attach
   * @param id      A unique ID for the message
   */
  constructor (user: User, public payload: IPayload, id?: string) {
    super(user, id)
  }

  toString () {
    return JSON.stringify(this.payload)
  }
}

/** Represent an incoming event notification. */
export abstract class EventMessage extends Message {
  abstract event: string
  toString () {
    return `${this.event} message for ${this.user.name}`
  }
}

/** Represent a room enter event for a user. */
export class EnterMessage extends EventMessage {
  event = 'enter'
}

/** Represent a room leave event for a user. */
export class LeaveMessage extends EventMessage {
  event = 'leave'
}

/** Represent a topic change event from a user. */
export class TopicMessage extends EventMessage {
  event = 'topic'
}

/** JSON data for server request event message. */
export interface IServerOptions {
  userId: string  // The user the request relates to
  roomId?: string // The room to message the user from
  data?: any      // Any data to be used by callbacks
  id?: string     // ID for the message
}

/** Represent message data coming from a server request. */
export class ServerMessage extends EventMessage {
  event = 'request'
  data: any

  /** Create a server message for a user. */
  constructor (options: IServerOptions) {
    super(
      users.byId(options.userId, {
        room: (options.roomId)
          ? { id: options.roomId }
          : undefined
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

/** Represent a message where nothing matched. */
export class CatchAllMessage extends Message {
  constructor (public message: Message) {
    super(message.user, message.id)
  }

  toString () {
    return this.message.toString()
  }
}
