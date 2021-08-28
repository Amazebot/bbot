import { EventMessage } from './EventMessage'
import { IMessageProps } from './Message'

interface IWebMessageAttributes extends IMessageProps {
  /** GET request params or POST json data */
  data: any
}

/** Represent message data coming from a server request. */
export class WebMessage extends EventMessage implements IWebMessageAttributes {
  data: any
  event = 'web request'

  constructor ({ id, user, room, data }: IWebMessageAttributes) {
    super({ id, user, room })
    this.data = data
  }

  toString () {
    return `Data for user ${this.user.id}: ${JSON.stringify(this.data)}`
  }
}
