/**
 * @module adapter
 * Exports the base class for each adapter type.
 * These provide structure for extensions but do nothing internally.
 */
import path from 'path'
import { events, Events } from '../events'
import { config, IConfig } from '../argv'
import { logger, Logger } from '../logger'
import * as bot from '../bot'

/** Collection of adapter types and their loaded adapter. */
export const adapters: { [key: string]: Adapter | undefined } = {}

/** Base adapter interface, properties common to all adapters. */
export interface IAdapter {
  name: string,
  events: Events,
  config: IConfig,
  logger: Logger,
  start: () => Promise<void>,
  shutdown: () => Promise<void>
}

/** Base Adapter class, extending to create different types of adapters. */
export abstract class Adapter implements IAdapter {
  name = 'base-adapter'
  events = events
  config = config
  logger = logger
  bot = bot
  async start () {
    this.logger.info('Generic adapter `start` called without override')
  }
  async shutdown () {
    this.logger.info('Generic adapter `shutdown` called without override')
  }
}

/** Export all adapter types. */
export * from './message'

/** Load all adapters, but don't yet start them. */
export function loadAdapters () {
  adapters.message = loadAdapter(config.messageAdapter)
  adapters.language = loadAdapter(config.languageAdapter)
  adapters.storage = loadAdapter(config.storageAdapter)
  adapters.webhook = loadAdapter(config.webhookAdapter)
  adapters.analytics = loadAdapter(config.analyticsAdapter)
}

/** Unload adapters for resetting bot */
export function unloadAdapters () {
  delete adapters.message
  delete adapters.language
  delete adapters.storage
  delete adapters.webhook
  delete adapters.analytics
}

/**
 * Require adapter module.
 * Resolves local path or NPM package.
 * If local path given, attempt to resolve a number of possible locations in
 * case bbot running from tests or inherited as sub-module etc.
 */
export function loadAdapter (adapterPath?: string) {
  if (!adapterPath) return null
  if (/^(\/|\.|\\)/.test(adapterPath)) {
    let modulePath = 'node_modules/bbot/dist'
    let sourcePath = 'src'
    let mainPath = path.dirname(require.main!.filename)
    let mainModule = path.resolve(mainPath, modulePath)
    let currentPath = process.cwd()
    let currentModule = path.resolve(currentPath, modulePath)
    adapterPath = require.resolve(adapterPath, {
      paths: [ mainPath, mainModule, currentPath, currentModule, sourcePath ]
    })
  }
  logger.debug(`Loading adapter from ${adapterPath}`)
  return require(adapterPath).use()
}

/** Start each adapter concurrently, to resolve when all ready. */
export function startAdapters () {
  let starting = []
  for (let type of Object.keys(adapters)) {
    let adapter = adapters[type]
    if (adapter) {
      logger.debug(`Starting ${type} adapter ${adapter.name}`)
      starting.push(Promise.resolve(adapter.start()))
    } else {
      logger.debug(`No ${type} adapter defined`)
    }
  }
  return Promise.all(starting)
}
