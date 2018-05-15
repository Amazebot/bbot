import {
  User,
  random
} from '..'

/** Represents an incoming message from the chat. */
export abstract class Message {
  /**
   * Create a message.
   * @param user The user who sent the message
   * @param id   A unique ID for the message
   */
  constructor (public user: User, public id: string = random()) {}

  /** String representation of the message */
  abstract toString (): string
}

/**
 * NLU attributes interface
 * @param intent A key characterising what the message was about
 * @param entities Additional data inferred from the message or context
 * @param confidence The level of surety that the NLU provider is correct
 */
export interface INaturalLanguage {
  intent: string
  entities: {[key: string]: any}
  confidence: number
}

/** A plain text/string message type. */
export class TextMessage extends Message {
  nlu?: INaturalLanguage

  /**
   * Create a text message.
   * @param user The user who sent the message
   * @param text The user who sent the message
   * @param id   A unique ID for the message
   */
  constructor (user: User, public text: string, id?: string) {
    super(user, id)
  }

  toString () {
    return this.text
  }
}

/** Represent an incoming event notification. */
export abstract class EventMessage extends Message {
  abstract event: string
  toString () {
    return `${this.event} message for ${this.user.name}`
  }
}

/** Represent a room enter event for a user. */
export class EnterMessage extends EventMessage {
  event = 'enter'
}

/** Represent a room leave event for a user. */
export class LeaveMessage extends EventMessage {
  event = 'leave'
}

/** Represent a topic change event from a user. */
export class TopicMessage extends EventMessage {
  event = 'topic'
}

/** Represent a message where nothing matched. */
export class CatchAllMessage extends Message {
  constructor (public message: Message) {
    super(message.user, message.id)
  }

  toString () {
    return this.message.toString()
  }
}
