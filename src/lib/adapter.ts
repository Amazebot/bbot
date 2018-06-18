import path from 'path'
import * as bot from '..'

/** Collection of adapter (loose) types and their loaded adapter. */
export const adapters: { [key: string]: any | null } = {}

/**
 * Require adapter module.
 * Resolves local path or NPM package.
 * If local path given, attempt to resolve a number of possible locations in
 * case bBot running from tests or inherited as sub-module etc.
 */
export function loadAdapter (adapterPath?: string) {
  if (!adapterPath) return null
  if (/^(\/|\.|\\)/.test(adapterPath)) {
    let sourcePath = 'src'
    let modulePath = 'node_modules/bbot/dist'
    let mainPath = path.dirname(require.main!.filename)
    let mainModule = path.resolve(mainPath, modulePath)
    let currentPath = process.cwd()
    let currentModule = path.resolve(currentPath, modulePath)
    let resolver = {
      paths: [ sourcePath, mainPath, mainModule, currentPath, currentModule ]
    }
    adapterPath = require.resolve(adapterPath, resolver)
  }
  bot.logger.debug(`[adapter] loading from ${adapterPath}`)
  return require(adapterPath).use(bot)
}

/** Load all adapters, but don't yet start them. */
export function loadAdapters () {
  adapters.message = loadAdapter(bot.config.messageAdapter)
  adapters.language = loadAdapter(bot.config.languageAdapter)
  adapters.storage = loadAdapter(bot.config.storageAdapter)
  adapters.webhook = loadAdapter(bot.config.webhookAdapter)
  adapters.analytics = loadAdapter(bot.config.analyticsAdapter)
}

/** Start each adapter concurrently, to resolve when all ready. */
export function startAdapters () {
  return Promise.all(Object.keys(adapters).map((type) => {
    let adapter = adapters[type]
    if (adapter) {
      bot.logger.debug(`[adapter] starting ${type} type, ${adapter.name}`)
      return Promise.resolve(adapter.start())
    } else {
      bot.logger.debug(`[adapter] no ${type} type adapter defined`)
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
