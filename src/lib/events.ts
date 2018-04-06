import { EventEmitter } from 'events'

/** Extending only for consistent interfaces */
export class Events extends EventEmitter {}

/**
 * Event Emitter for listening to bot events.
 * @example <caption>As module</caption>
 *  import * as bbot from 'bbot'
 *  bbot.events.on('ready', () => console.log('bbot is ready'))
 * @example <caption>As script</caption>
 *  module.exports = (bot) => {
 *    bot.events.on('ready', () => console.log('bbot is ready'))
 *  }
 */
export const events = new Events()
