import { Message, IMessageProps } from './Message'

export interface ITextMessageAttributes extends IMessageProps {
  /** The text content of the message */
  text: string
}

/** A plain text/string message type. */
export class TextMessage extends Message implements ITextMessageAttributes {
  text: string
  constructor ({ id, user, room, text }: ITextMessageAttributes) {
    super({ id, user, room })
    this.text = text
  }

  toString () {
    return this.text
  }
}
