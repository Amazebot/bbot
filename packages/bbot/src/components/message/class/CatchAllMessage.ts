import { Message } from './Message'

/** Represent a message where nothing matched (wraps the original message). */
export class CatchAllMessage extends Message {
  constructor (public message: Message) {
    super(message.id, message.user, message.room)
  }

  toString () {
    return this.message.toString()
  }

  /** Get original message type. */
  get type () {
    return this.message.type
  }
}
