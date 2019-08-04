import { User } from '../../user/class'
import { Room } from '../../room/class'
import { Payload } from '../../payload/class'
import { Message } from './Message'

/** A message containing payload attributes from messaging platform. */
export class RichMessage extends Message {
  /**
   * Create a rich message.
   * @param id      A unique ID for the message
   * @param user    The user who sent the message
   * @param room    The room the message was sent from
   * @param payload The payload to attach
   * @param text    The text content of the message
   */
  constructor (
    id: string,
    user: User,
    room: Room,
    public payload: Payload,
    public text?: string
  ) {
    super(id, user, room)
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
