import { User } from '../components/user'
import { IPayload } from '../components/payload'
import {
  Message,
  BlankMessage,
  TextMessage,
  RichMessage,
  EnterMessage,
  LeaveMessage,
  TopicMessage,
  IServerOptions,
  ServerMessage,
  CatchAllMessage
} from '../components/message'

/** Create instances of different message types. */
export class MessageController {

  /** Create a blank message */
  blank = () => new BlankMessage()

  /** Create a text message. */
  text = (user: User, text: string, id?: string) => new TextMessage(user, text, id)

  /** Create a rich message. */
  rich = (user: User, payload: IPayload, id?: string) => new RichMessage(user, payload, id)

  /** Create an enter event message. */
  enter = (user: User, id?: string) => new EnterMessage(user, id)

  /** Create a leave event message. */
  leave = (user: User, id?: string) => new LeaveMessage(user, id)

  /** Create a topic event message. */
  topic = (user: User, id?: string) => new TopicMessage(user, id)

  /** Create a server request message. */
  server = (options: IServerOptions) => new ServerMessage(options)

  /** Create a catch all message. */
  catchAll = (msg: Message) => new CatchAllMessage(msg)
}

export const messages = new MessageController()

export default messages
