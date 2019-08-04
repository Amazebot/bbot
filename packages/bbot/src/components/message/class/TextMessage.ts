import { User } from '../../user/class'
import { Room } from '../../room/class'
import { Message } from './Message'

/** A plain text/string message type. */
export class TextMessage extends Message {
  /**
   * Create a text message.
   * @param id   A unique ID for the message
   * @param user The user who sent the message
   * @param room The room the message was sent from
   * @param text The text content of the message
   */
  constructor (
    id: string,
    user: User,
    room: Room,
    public text: string
  ) {
    super(id, user, room)
  }

  toString () {
    return this.text
  }
}
