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
  constructor (user: bot.User, public text: string, id?: string) {
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

/** Envelope interface, to create from scratch */
export interface IEnvelope {
  user?: bot.User
  room?: {
    id?: string
    name?: string
  },
  strings?: string[]
  payload?: any
}

/**
 * Envelopes are the outgoing equivalent of a message. They can be created in
 * response to a received message, or initialised to send without an original.
 * The envelope contains the details of how to address content (strings or
 * payload data) for a variety of message types within the message platform.
 */
export class Envelope implements IEnvelope {
  room: {
    id?: string
    name?: string
  } = {}
  user?: bot.User
  message?: Message
  strings?: string[]
  payload?: any
  /** Add string content to an envelope, could be message text or reaction */
  write (...strings: string[]): Envelope {
    this.strings = strings
    return this
  }
  /** Add multi-media attachments to a message, could be buttons or files etc */
  attach (payload: any): Envelope {
    if (!this.payload) this.payload = {}
    Object.assign(this.payload, payload)
    return this
  }
}

/**
 * Create an envelope to send from scratch (without original message)
 * Addresses to user's room if user given. If room given, will override user.
 */
export function createEnvelope (address: IEnvelope): Envelope {
  const envelope = new Envelope()
  if (address.user) envelope.user = address.user
  if (address.room) envelope.room = address.room
  else if (address.user) envelope.room = address.user.room
  return envelope
}

/** Address an envelope back to a message's origin. */
export function replyEnvelope (address: bot.B): Envelope {
  const envelope = new Envelope()
  envelope.message = address.message
  envelope.user = address.message.user
  envelope.room = address.message.user.room
  return envelope
}
