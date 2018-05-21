import * as bot from '..'

/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of listener or middleware.
 * Will always be created with at least a message object (can be empty).
 * The `done` property tells middleware not to continue processing state.
 */
export interface IState {
  message: bot.Message // the received message, persists in state for response
  method?: bot.MessageMethod // response type method (send, reply, emote, etc)
  strings?: string[] // response string content (message, topic or emote text)
  done?: boolean
  [key: string]: any
}

/**
 * B is a pseudonym for the internal state handled by the thought process.
 * States have access to all bbot modules from the bot property.
 * It has defined properties but can be extended with any key/value pair.
 */
export class B implements IState {
  bot = bot
  done: boolean = false
  message: bot.Message
  listener: bot.Listener
  match?: any
  matched?: boolean
  method?: bot.MessageMethod
  envelope?: bot.Envelope
  strings?: string[]
  [key: string]: any
  constructor (startingState: IState) {
    // Manual assignment of required keys is just a workaround for type checking
    this.message = startingState.message
    this.listener = startingState.listener
    for (let key in startingState) this[key] = startingState[key]
  }

  /** Indicate that no other listener should be called for the state */
  finish () {
    this.done = true
  }
}
