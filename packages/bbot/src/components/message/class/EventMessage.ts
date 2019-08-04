import { Message } from './Message'

/** Represent an incoming event notification. */
export abstract class EventMessage extends Message {
  abstract event: string
  toString () {
    return `${this.event} message for ${this.user.name}`
  }
}
