/** @module state */

import * as bot from '..'

/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of listener or middleware.
 * The `done` property tells middleware not to continue processing state.
 */
export interface IState {
  done?: boolean
  message?: bot.Message
  listener?: bot.Listener
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
  [key: string]: any
  constructor (startingState: IState) {
    // Manual assignment of required keys is just a workaround for type checking
    this.listener = startingState.listener
    this.message = startingState.message
    for (let key in startingState) this[key] = startingState[key]
  }

  /** Indicate that no other listener should be called for the state */
  finish () {
    this.done = true
  }
}
