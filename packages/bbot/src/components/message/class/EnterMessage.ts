import { EventMessage } from './EventMessage'

/** Represent a room enter event for a user. */
export class EnterMessage extends EventMessage {
  event = 'enter'
}
