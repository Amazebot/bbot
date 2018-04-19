/** @module state */

import * as bot from '..'

/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of listener or middleware.
 */
export interface IState {
  [key: string]: any,
  listener?: bot.Listener,
  message?: bot.Message,
  match?: any
}

/**
 * State values can be modified by processing (e.g. middleware).
 * State have access to all bbot modules from the bot property.
 */
export class State implements IState {
  [key: string]: any
  bot: any = bot
  listener?: bot.Listener
  message?: bot.Message
  match?: any
  constructor (startingState?: IState) {
    if (!startingState) return
    Object.keys(startingState).forEach((key: string) => {
      this[key] = startingState[key]
    })
  }
}
