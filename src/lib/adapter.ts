import path from 'path'
import * as bot from '..'

/** Collection of adapter types and their loaded adapter. */
export const adapters: {
  message?: bot.MessageAdapter | undefined
  language?: bot.LanguageAdapter | undefined
  storage?: bot.StorageAdapter | undefined
  [key: string]: bot.Adapter | undefined
} = {}

/**
 * Require adapter module from local path or NPM package.
 * If local path given, attempt to resolve a number of possible locations in
 * case bBot running from tests or as a node project dependency etc.
 * If a non-path (e.g. module name) is given, but can't be loaded, it attempts
 * to load that name from within the included adapters path.
 */
export function loadAdapter (adapterPath?: string) {
  if (!adapterPath) return
  let isPath = /^(\/|\.|\\)/.test(adapterPath)
  if (!isPath) {
    bot.logger.debug(`[adapter] loading adapter by name: ${adapterPath}`)
    try {
      return require(adapterPath).use(bot)
    } catch (e) {
      bot.logger.debug(`[adapter] failed to load module, will try from path`)
    }
  }
  if (!isPath) adapterPath = `./adapters/${adapterPath}`
  bot.logger.debug(`[adapter] loading adapter by path: ${adapterPath}`)
  let sourcePath = 'src'
  let modulePath = 'node_modules/bbot/dist'
  let mainPath = path.dirname(require.main!.filename)
  let mainModule = path.resolve(mainPath, modulePath)
  let currentPath = process.cwd()
  let currentModule = path.resolve(currentPath, modulePath)
  let resolver = {
    paths: [ sourcePath, mainPath, mainModule, currentPath, currentModule ]
  }
  try {
    adapterPath = require.resolve(adapterPath, resolver)
    return require(adapterPath).use(bot)
  } catch (e) {
    bot.logger.error(`[adapter] loading failed`, e)
    throw new Error(`[adapter] could not load from ${adapterPath}`)
  }
}

/** Load all adapters, but don't yet start them. */
export function loadAdapters () {
  try {
    adapters.message = loadAdapter(bot.config.messageAdapter)
    adapters.language = loadAdapter(bot.config.languageAdapter)
    adapters.storage = loadAdapter(bot.config.storageAdapter)
    adapters.webhook = loadAdapter(bot.config.webhookAdapter)
    adapters.analytics = loadAdapter(bot.config.analyticsAdapter)
  } catch (e) {
    bot.logger.error(e)
    throw new Error(`[adapter] failed to load all adapters`)
  }
}

/** Start each adapter concurrently, to resolve when all ready. */
export function startAdapters () {
  return Promise.all(Object.keys(adapters).map((type) => {
    let adapter = adapters[type]
    if (adapter) {
      bot.logger.debug(`[adapter] starting ${type} adapter: ${adapter.name}`)
      return Promise.resolve(adapter.start())
    } else {
      bot.logger.debug(`[adapter] no ${type} type adapter defined`)
    }
    return undefined
  }))
}

/** Run shutdown on each adapter concurrently, to resolve when all shutdown */
export function shutdownAdapters () {
  return Promise.all(Object.keys(adapters).map((type) => {
    let adapter = adapters[type]
    if (adapter) {
      bot.logger.debug(`[adapter] shutdown ${type} adapter: ${adapter.name}`)
      return Promise.resolve(adapter.shutdown())
    }
    return undefined
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
