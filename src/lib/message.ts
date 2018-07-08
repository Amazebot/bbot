import * as bot from '..'

/** Represents an incoming message from the chat. */
export abstract class Message {
  user: bot.User

  /**
   * Create a message.
   * @param user The sender's user instance (or properties to create it)
   * @param id   A unique ID for the message
   */
  constructor (user: bot.IUser, public id: string = bot.random()) {
    this.user = (user instanceof bot.User) ? user : new bot.User(user)
  }

  /** String representation of the message. */
  abstract toString (): string
}

/**
 * Interface for a Natural Language Understanding attributes.
 * @param id    The primary text code for a result
 * @param name  A display name equivalent for the ID
 * @param score The positivity or confidence rating of the result
 */
interface INLUR {
  id?: string
  name?: string
  score?: number
}

/**
 * NLU attributes interface. Extensible by adapters with custom results.
 * @param intent    A key characterising what the message was about
 * @param entities  Additional data inferred from the message or context
 * @param sentiment Tone or emotional data provided from NLU parsing of text
 * @param phrases   Collection denoting the key talking points in the text
 * @param act       How the proposition described is intended to be used
 * @param language  The language of the text, `.id` as an ISO code.
 */
export interface INaturalLanguage {
  intent?: INLUR[]
  entities?: INLUR[]
  sentiment?: INLUR[]
  phrases?: INLUR[]
  act?: INLUR[]
  language?: INLUR[]
  [key: string]: any
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
  constructor (user: bot.User, public text: string, id?: string) {
    super(user, id)
  }

  toString () {
    return this.text
  }
}

/** A message containing payload attributes from messaging platform. */
export class RichMessage extends Message {

  /**
   * Create a rich message.
   * @param user    The user who sent the message
   * @param payload The payload to attach
   * @param id      A unique ID for the message
   */
  constructor (user: bot.User, public payload: any, id?: string) {
    super(user, id)
  }

  toString () {
    return JSON.stringify(this.payload)
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
