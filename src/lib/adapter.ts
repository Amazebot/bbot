/**
 * @module adapter
 * Exports the base class for each adapter type.
 * These provide structure for extensions but do nothing internally.
 */
import path from 'path'
import { logger } from './logger'
import { config } from './argv'
import * as bot from '..'

/** Collection of adapter (loose) types and their loaded adapter. */
export const adapters: { [key: string]: any | null } = {}

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
    let resolver = {
      paths: [ mainPath, mainModule, currentPath, currentModule, sourcePath ]
    }
    adapterPath = require.resolve(adapterPath, resolver)
  }
  logger.debug(`Loading adapter from ${adapterPath}`)
  return require(adapterPath).use(bot)
}

/** Load all adapters, but don't yet start them. */
export function loadAdapters () {
  adapters.message = loadAdapter(config.messageAdapter)
  adapters.language = loadAdapter(config.languageAdapter)
  adapters.storage = loadAdapter(config.storageAdapter)
  adapters.webhook = loadAdapter(config.webhookAdapter)
  adapters.analytics = loadAdapter(config.analyticsAdapter)
}

/** Start each adapter concurrently, to resolve when all ready. */
export function startAdapters () {
  return Promise.all(Object.keys(adapters).map((type) => {
    let adapter = adapters[type]
    if (adapter) {
      logger.debug(`Starting ${type} adapter ${adapter.name}`)
      return Promise.resolve(adapter.start())
    } else {
      logger.debug(`No ${type} adapter defined`)
    }
  }))
}

/** Unload adapters for resetting bot */
export function unloadAdapters () {
  delete adapters.message
  delete adapters.language
  delete adapters.storage
  delete adapters.webhook
  delete adapters.analytics
}
