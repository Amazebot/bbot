import { resolve } from 'path'
import { logger, settings, envelope, message, nlu } from '.'
import * as bot from '..'

/** Adapter classes and loading utilities. */
export namespace adapter {
  /** Collection of loaded adapters. */
  export const adapters: {
    [key: string]: Adapter | undefined
    message?: Message,
    nlu?: NLU,
    storage?: Storage
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
      logger.debug(`[adapter] loading adapter by name: ${adapterPath}`)
      try {
        if (require.main) {
          return require(require.resolve(adapterPath, {
            paths: require.main.paths
          })).use(bot)
        } else return require(adapterPath)
      } catch (err) {
        if (/cannot find/i.test(err.message)) {
          logger.debug(`[adapter] failed as module, trying from path...`)
        } else {
          logger.error('[adapter] failed loading due to internal error')
          throw err
        }
      }
    }
    if (!isPath) adapterPath = `./adapters/${adapterPath}`
    logger.debug(`[adapter] loading adapter by path: ${adapterPath}`)
    let sourcePath = 'src'
    let distPath = 'dist'
    let modulePath = 'node_modules/bbot/dist'
    let currentPath = process.cwd()
    let currentModule = resolve(currentPath, modulePath)
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
      logger.error(`[adapter] loading failed: ${err.message}`)
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
    for (let type of Object.keys(adapters)) {
      if (adapters[type]) continue // already loaded
      const adapterPath = settings.get(`${type}-adapter`)
      if (adapterPath && adapterPath !== '') {
        try {
          register(type, adapterPath)
        } catch (err) {
          logger.error(err.message)
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
        logger.debug(`[adapter] starting ${type} adapter: ${adapter.name}`)
        return Promise.resolve(adapter.start()).catch((err) => {
          logger.error(`[adapter] startup failed: ${err.message}`)
          throw err
        })
      } else {
        logger.debug(`[adapter] no ${type} type adapter defined`)
      }
      return undefined
    }))
  }

  /** Run shutdown on each adapter concurrently, to resolve when all shutdown */
  export function shutdownAll () {
    return Promise.all(Object.keys(adapters).map((type) => {
      let adapter = adapters[type]
      if (adapter) {
        logger.debug(`[adapter] shutdown ${type} adapter: ${adapter.name}`)
        return Promise.resolve(adapter.shutdown())
      }
      return undefined
    }))
  }

  /** Unload adapters for resetting bot */
  export function unloadAll () {
    for (let type in adapters) delete adapters[type]
  }

  /** Adapter base class, extended for different types of adapters. */
  export abstract class Adapter {
    /** Name of adapter, used for logs */
    name = 'base-adapter'

    /**
     * Create an adapter instance.
     * Adapter modules should export a `use` method that accepts the bot, to
     * provide to their adapter class constructor, returning the instance.
     * @param bot The current bBot instance
     */
    constructor (public bot: bot.Bot) {}

    /** Extend to add any bot startup requirements in adapter environment */
    abstract start (): Promise<void>

    /** Extend to add any bot shutdown requirements in adapter environment */
    abstract shutdown (): Promise<void>
  }

  /** Message Adapter class, extended to connect bBot with messaging platform. */
  export abstract class Message extends Adapter {
    name = 'message-adapter'

    /** Open connection to messaging platform */
    abstract start (): Promise<void>

    /** Close connection to messaging platform */
    abstract shutdown (): Promise<void>

    /** Take dispatched envelope to action in platform */
    abstract dispatch (envelope: envelope.Envelope): Promise<any>
  }

  /** NLU adapter class, extended to connect bBot with NLU platform. */
  export abstract class NLU extends Adapter {
    name = 'nlu-adapter'

    /** Open connection to messaging platform */
    abstract start (): Promise<void>

    /** Close connection to messaging platform */
    abstract shutdown (): Promise<void>

    /** Add NLU results from NLP platform analysis */
    abstract process (msg: message.Text): Promise<nlu.ResultsRaw | undefined>
  }

  /**
   * Storage adapter class, extended to connect brain with external storage
   * provider. Methods are just raw endpoints to be extended.
   */
  export abstract class Storage extends Adapter {
    name = 'storage-adapter'

    /** Open connection to storage provider */
    abstract start (): Promise<void>

    /** Close connection to storage provider */
    abstract shutdown (): Promise<void>

    /** Store memory data from brain */
    abstract saveMemory (data: any): Promise<void>

    /** Get memory data for brain */
    abstract loadMemory (): Promise<any>

    /** Add data to series in given collection */
    abstract keep (collection: string, data: any): Promise<void>

    /** Query subset of collection from storage provider */
    abstract find (collection: string, params: any): Promise<any>

    /** Query subset of collection from storage provider, returning single item */
    abstract findOne (collection: string, params: any): Promise<any>

    /** Remove anything from collection in storage that matches params */
    abstract lose (collection: string, params: any): Promise<void>
  }
}
