import { EventMessage } from './EventMessage'

/** Represent a room leave event for a user. */
export class LeaveMessage extends EventMessage {
  event = 'leave'
}
