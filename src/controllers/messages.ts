import * as user from '../components/user'
import {
  Message,
  Blank,
  Text,
  Rich,
  Enter,
  Leave,
  Topic,
  IServerOptions,
  Server,
  CatchAll
} from '../components/message'

/** Create instances of different message types. */
export class MessageController {

  /** Create a blank message */
  blank = () => new Blank()

  /** Create a text message. */
  text = (user: user.User, text: string, id?: string) => {
    return new Text(user, text, id)
  }

  /** Create a rich message. */
  rich = (user: user.User, payload: any, id?: string) => {
    return new Rich(user, payload, id)
  }

  /** Create an enter event message. */
  enter = (user: user.User, id?: string) => new Enter(user, id)

  /** Create a leave event message. */
  leave = (user: user.User, id?: string) => new Leave(user, id)

  /** Create a topic event message. */
  topic = (user: user.User, id?: string) => new Topic(user, id)

  /** Create a server request message. */
  server = (options: IServerOptions) => new Server(options)

  /** Create a catch all message. */
  catchAll = (msg: Message) => new CatchAll(msg)
}

export const messages = new MessageController()

export default messages
