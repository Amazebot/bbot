/**
 * @module bbot
 * Exports all bBot modules for access and extension.
 * For simply running the bot and adding scripts, this interface isn't required
 * as the start module is also available via require('bbot/start'), but when
 * a component needs extension, the index exports can be used before starting
 * the bot.
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.middleware.Middleware = MyCustomMiddlewareClass
 *  bbot.bot.start()
 */

import * as bot from './lib/bot'
import * as logger from './lib/logger'
import * as middleware from './lib/middleware'
export {
  bot,
  logger,
  middleware
}
