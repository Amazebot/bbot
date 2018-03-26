/**
 * @module bot
 * The core instance of bBot. Manages operational aspects like start/stopping,
 * logging, event emitting, the internal server and external connections as well
 * as managing middleware and executing the high level "thought process".
 */

import { EventEmitter } from 'events'
import { config } from './argv'
import { logger } from './logger'
import { IOptions } from '../config/botInterfaces'
export let started: boolean = false

/**
 * Event Emitter for listening to bot events.
 * @example <caption>As module</caption>
 *  import * as bbot from 'bbot'
 *  bbot.bot.events.on('ready', () => console.log('bbot is ready'))
 * @example <caption>As script</caption>
 *  module.exports = (bot) => {
 *    bot.events.on('ready', () => console.log('bbot is ready'))
 *  }
 */
export const events = new EventEmitter()

/**
 * Make it go!
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.bot.start()
 */
export async function start (opts?: IOptions) {
  logger.info('Bleep Bloop... starting up ~(O_O)~')
  Object.assign(config, opts)
  logger.info('Using config:', config)
  started = true
  events.emit('ready')
  return exports
}
