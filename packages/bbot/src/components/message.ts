/**
 * Represent and handle different types of message to/from chat platform.
 * @module components/message
 */

import logger from '../util/logger'
import { random } from '../util/id'
import { users, User, IUser } from './user'
import { NLU } from './nlu'
import { IPayload } from './payload'

/** Represents an incoming message from the chat. */
export abstract class Message {
  id: string
  user: User
  nlu?: NLU
  [key: string]: any

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
   * @param text The text content of the message
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
   * @param text The text content of the message
   * @param id      A unique ID for the message
   */
  constructor (user: User, public payload: IPayload, public text?: string, id?: string) {
    super(user, id)
  }

  toString () {
    return (
      this.payload.attachments &&
      this.payload.attachments.length &&
      this.payload.attachments[0].fallback
    )
      ? this.payload.attachments[0].fallback
      : this.text || JSON.stringify(this.payload.attachments)
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

/** Create instances of different message types. */
export class MessageController {

  /** Create a blank message */
  blank = () => new BlankMessage()

  /** Create a text message. */
  text = (user: User, text: string, id?: string) => {
    return new TextMessage(user, text, id)
  }

  /** Create a rich message. */
  rich = (user: User, payload: IPayload, text?: string, id?: string) => {
    return new RichMessage(user, payload, text, id)
  }

  /** Create an enter event message. */
  enter = (user: User, id?: string) => {
    return new EnterMessage(user, id)
  }

  /** Create a leave event message. */
  leave = (user: User, id?: string) => {
    return new LeaveMessage(user, id)
  }

  /** Create a topic event message. */
  topic = (user: User, id?: string) => {
    return new TopicMessage(user, id)
  }

  /** Create a server request message. */
  server = (options: IServerOptions) => {
    return new ServerMessage(options)
  }

  /** Create a catch all message. */
  catchAll = (msg: Message) => {
    return new CatchAllMessage(msg)
  }
}

export const messages = new MessageController()

export default messages
