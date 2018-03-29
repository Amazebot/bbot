/**
 * @module bbot
 * Merges all bBot modules for access and extension.
 * For simply running the bot and adding scripts, this interface isn't required
 * as the start module is also available via require('bbot/start'), but when
 * a component needs extension, the index exports can be used before starting
 * the bot.
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.middleware.Middleware = MyCustomMiddlewareClass
 *  bbot.start()
 */
export * from './lib/argv'
export * from './lib/events'
export * from './lib/logger'
export * from './lib/middleware'
export * from './lib/adapter'
export * from './lib/bot'

/** Load once modules exported */
import { load } from './lib/bot'
load()
