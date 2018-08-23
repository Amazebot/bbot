import path from 'path'
import * as bot from '..'

/**
 * Require adapter module from local path or NPM package.
 * If a module name is given, it will be required as normal or from the parent
 * module path. If that fails, attempt to load from the included adapters path.
 * If local path given, attempt to resolve a number of possible locations in
 * case bBot running from tests or as a local dependency (in development).
 */
export function loadAdapter (adapterPath?: string) {
  if (!adapterPath) return
  let isPath = /^(\/|\.|\\)/.test(adapterPath)
  if (!isPath) {
    bot.logger.debug(`[adapter] loading adapter by name: ${adapterPath}`)
    try {
      if (require.main) {
        return require(require.resolve(adapterPath, {
          paths: require.main.paths
        })).use(bot)
      } else return require(adapterPath)
    } catch (err) {
      if (/cannot find/i.test(err.message)) {
        bot.logger.debug(`[adapter] failed to load module, will try from path`)
      } else {
        bot.logger.error('[adapter] failed loading due to internal error')
        throw err
      }
    }
  }
  if (!isPath) adapterPath = `./adapters/${adapterPath}`
  bot.logger.debug(`[adapter] loading adapter by path: ${adapterPath}`)
  let sourcePath = 'src'
  let distPath = 'dist'
  let modulePath = 'node_modules/bbot/dist'
  let currentPath = process.cwd()
  let currentModule = path.resolve(currentPath, modulePath)
  let resolver = { paths: [ sourcePath, distPath, currentPath, currentModule ] }
  if (require.main) resolver.paths = resolver.paths.concat(...require.main.paths)
  try {
    adapterPath = require.resolve(adapterPath, resolver)
    return require(adapterPath).use(bot)
  } catch (err) {
    bot.logger.error(`[adapter] loading failed: ${err.message}`)
    throw err
  }
}

/** Collection of allowed adapter types for loading. */
const adapterTypes = ['message', 'nlu', 'storage']

/** Collection of adapter types and their loaded adapter. */
export class Adapters {
  [key: string]: any
  message?: bot.MessageAdapter | undefined
  nlu?: bot.NLUAdapter | undefined
  storage?: bot.StorageAdapter | undefined

  /** Load all adapters, but don't yet start them. */
  load () {
    this.unload()
    for (let type of adapterTypes) {
      const adapterPath = bot.settings.get(`${type}-adapter`)
      if (adapterPath && adapterPath !== '' && !this[type]) {
        try {
          this[type] = loadAdapter(adapterPath)
        } catch (err) {
          bot.logger.error(err.message)
          throw new Error(`[adapter] failed to load all adapters`)
        }
      }
    }
  }

  /** Start each adapter concurrently, to resolve when all ready. */
  start () {
    return Promise.all(Object.keys(this).map((type) => {
      let adapter = this[type]
      if (adapter) {
        bot.logger.debug(`[adapter] starting ${type} adapter: ${adapter.name}`)
        return Promise.resolve(adapter.start()).catch((err) => {
          bot.logger.error(`[adapter] startup failed: ${err.message}`)
          throw err
        })
      } else {
        bot.logger.debug(`[adapter] no ${type} type adapter defined`)
      }
      return undefined
    }))
  }

  /** Run shutdown on each adapter concurrently, to resolve when all shutdown */
  shutdown () {
    return Promise.all(Object.keys(this).map((type) => {
      let adapter = this[type]
      if (adapter) {
        bot.logger.debug(`[adapter] shutdown ${type} adapter: ${adapter.name}`)
        return Promise.resolve(adapter.shutdown())
      }
      return undefined
    }))
  }

  /** Unload adapters for resetting bot */
  unload () {
    for (let type of adapterTypes) delete this[type]
  }
}

export const adapters = new Adapters()
