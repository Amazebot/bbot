/**
 * Central event emitter for decoupled processing.
 * @module util/events
 */

import { EventEmitter } from 'events'

/** Extending only for consistent interfaces */
export class Events extends EventEmitter {}

/**
 * Event Emitter for listening to bot events.
 * @example
 *  import * as bot from 'bbot'
 *  bot.events.on('started', () => console.log('bot is ready'))
 */
export const events = new Events()

export default events
