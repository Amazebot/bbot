import { EventMessage } from './EventMessage'

/** Represent a topic change event from a user. */
export class TopicMessage extends EventMessage {
  event = 'topic'
}
