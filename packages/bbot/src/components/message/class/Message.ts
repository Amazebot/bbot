import { User } from '../../user/class'
import { Room } from '../../room/class'
import { NLU } from '../../nlu/class'

export interface IMessage {
  /** A unique ID for the message. */
  id: string
  /** The user who sent the message. */
  user: User
  /** The room the message was sent from. */
  room: Room
  /** Natural Language Understanding can be appended to message. */
  nlu?: NLU
}

/** Represents an incoming message from the chat. */
export abstract class Message implements IMessage {
  id: string
  user: User
  room: Room
  nlu?: NLU

  /** Create a message. */
  constructor ({ id, user, room, nlu }: IMessage) {
    this.id = id
    this.user = user
    this.room = room
    this.nlu = nlu
  }

  /** String representation of the message. */
  abstract toString (): string

  /** Return a copy of message to alter without effecting original */
  clone () {
    return Object.assign(Object.create(this), this)
  }

  /** Get message type, allows filtering responders. */
  get type () {
    return this.constructor.name
  }
}
