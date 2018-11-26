import path from 'path'
import * as bot from '..'

/** Adapter loading utilities. */
export namespace adapter {
  /** Allowed adapter types. */
  export const types = ['message', 'nlu', 'storage']

  /** Collection of loaded adapters */
  export const adapters: {
    [key: string]: bot.Adapter | undefined
    message?: bot.MessageAdapter
    nlu?: bot.NLUAdapter
    storage?: bot.StorageAdapter
  } = {}

  /**
   * Require adapter module from local path or NPM package.
   * If a module name is given, it will be required as normal or from the parent
   * module path. If that fails, attempt to load from included adapters path.
   * If local path given, attempt to resolve a number of possible locations in
   * case bBot running from tests or as a local dependency (in development).
   */
  export function fromPath (adapterPath: string) {
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
          bot.logger.debug(`[adapter] failed as module, trying from path...`)
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
    let resolver = {
      paths: [ sourcePath, distPath, currentPath, currentModule ]
    }
    if (require.main) {
      resolver.paths = resolver.paths.concat(...require.main.paths)
    }
    try {
      adapterPath = require.resolve(adapterPath, resolver)
      return require(adapterPath).use(bot)
    } catch (err) {
      bot.logger.error(`[adapter] loading failed: ${err.message}`)
      throw err
    }
  }

  /** Load and register adapter against type */
  export function register (type: string, loadPath: string) {
    switch (type) {
      case 'message': adapters.message = fromPath(loadPath); break
      case 'nlu': adapters.nlu = fromPath(loadPath); break
      case 'storage': adapters.storage = fromPath(loadPath); break
    }
  }

  /** Load configured adapters, but don't yet start them. */
  export function loadAll () {
    for (let type of types) {
      if (adapters[type]) continue // already loaded
      const adapterPath = bot.settings.get(`${type}-adapter`)
      if (adapterPath && adapterPath !== '') {
        try {
          register(type, adapterPath)
        } catch (err) {
          bot.logger.error(err.message)
          throw new Error(`[adapter] failed to load all adapters`)
        }
      }
    }
  }

  /** Start each adapter concurrently, to resolve when all ready. */
  export function startAll () {
    return Promise.all(Object.keys(adapters).map((type) => {
      let adapter = adapters[type]
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
  export function shutdownAll () {
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
  export function unloadAll () {
    for (let type in adapters) delete adapters[type]
  }
}
