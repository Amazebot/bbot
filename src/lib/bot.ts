import { EventEmitter } from 'events'

/**
 * Event Emitter for listening to bot events.
 * @example
 *  import * as b from 'bbot'
 *  b.bot.events.on('ready', () => console.log('bbot is ready'))
 */
export const events = new EventEmitter()

/**
 * Make it go!
 * @example
 * import * as b from 'bbot'
 * b.bot.start()
 */
export async function start () {
  events.emit('ready')
}
