/**
 * Represent and handle different types of message to/from chat platform.
 * @module components/message
 */

import { logger, random } from '../../util'
import { User } from '../user/class'
import { Room } from '../room/class'
import { Payload } from '../payload/class'
import {
  TextMessage,
  RichMessage,
  EnterMessage,
  LeaveMessage,
  TopicMessage,
  CatchAllMessage,
  WebMessage
} from './class'

/** Create instances of different message types. */
export class MessageController {

  /** Create adapter controller for bot instance. */
  constructor (private _: {
    getUser: (id: string) => User
  }) {}

  /** Create a blank message */
  /** @todo fix with normal message and blank user */
  // blank = () => new BlankMessage()

  /** Create a text message. */
  text = (
    user: User,
    room: Room,
    text: string,
    id: string = random()
  ) => {
    return new TextMessage(id, user, room, text)
  }

  /** Create a rich message. */
  rich = (
    user: User,
    room: Room,
    payload: Payload,
    text?: string,
    id: string = random()
  ) => {
    return new RichMessage(id, user, room, payload, text)
  }

  /** Create an enter event message. */
  enter = (user: User, id: string = random()) => {
    return new EnterMessage(user, id)
  }

  /** Create a leave event message. */
  leave = (user: User, id: string = random()) => {
    return new LeaveMessage(user, id)
  }

  /** Create a topic event message. */
  topic = (user: User, id: string = random()) => {
    return new TopicMessage(user, id)
  }

  /** Create a server request message. */
  web = (
    userId: string  // The user the message relates to
    roomId?: string // The room to message the user in
    data?: any      // Any data to be used by callbacks
    id?: string     // ID for the message
  ) => {
    // users.byId(options.userId, {
    //   room: (options.roomId)
    //     ? { id: options.roomId }
    //     : undefined
    // }),
    if (data) {
      logger.debug(`[message] web data keys: ${Object.keys(data).join(', ')}`)
    }
    return new WebMessage(id, user, room, data)
  }

  /** Create a catch all message. */
  catchAll = (msg: Message) => {
    return new CatchAllMessage(msg)
  }
}
