import { EventMessage } from './EventMessage'

/** Represent message data coming from a server request. */
export class WebMessage extends EventMessage {
  event = 'web request'
  data: any = {}

  toString () {
    return `Data for user ${this.user.id}: ${JSON.stringify(this.data)}`
  }
}
