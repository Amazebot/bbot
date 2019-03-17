/**
 * Provide interfaces to external platforms for messaging, NLU, storage etc.
 * @module components/adapter
 */

import { resolve, dirname } from 'path'

import config from '../util/config'
import logger from '../util/logger'
import { Envelope } from '../components/envelope'
import { TextMessage } from '../components/message'
import { NLUResultsRaw } from '../components/nlu'
import { bBot, Bot } from '../bot'

/** Adapter base class, extended for different types of adapters. */
export abstract class Adapter {
  /** Name of adapter, used for logs */
  name = 'base-adapter'

  /**
   * Create an adapter instance.
   * Adapter modules should export a `use` method that accepts the bot, to
   * provide to their adapter class constructor, returning the instance.
   */
  constructor (public bot: Bot) {}

  /** Extend to add any bot startup requirements in adapter environment */
  abstract start (): Promise<void>

  /** Extend to add any bot shutdown requirements in adapter environment */
  abstract shutdown (): Promise<void>
}

/** Message Adapter class, extended to connect bBot with messaging platform. */
export abstract class MessageAdapter extends Adapter {
  name = 'message-adapter'

  /** Open connection to messaging platform */
  abstract start (): Promise<void>

  /** Close connection to messaging platform */
  abstract shutdown (): Promise<void>

  /** Take dispatched envelope to action in platform */
  abstract dispatch (envelope: Envelope): Promise<any>
}

/** NLU adapter class, extended to connect bBot with NLU platform. */
export abstract class NLUAdapter extends Adapter {
  name = 'nlu-adapter'

  /** Open connection to messaging platform */
  abstract start (): Promise<void>

  /** Close connection to messaging platform */
  abstract shutdown (): Promise<void>

  /** Add NLU results from NLP platform analysis */
  abstract process (msg: TextMessage): Promise<NLUResultsRaw | undefined>
}

/**
 * Storage adapter class, extended to connect brain with external storage
 * provider. Methods are just raw endpoints to be extended.
 */
export abstract class StorageAdapter extends Adapter {
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

/** Make Adapters available for extensions under a "namespace" */
export const abstracts = {
  Adapter,
  MessageAdapter,
  NLUAdapter,
  StorageAdapter
}

/** Loads adapters and initialises adapters. */
export class AdapterController {
  /** Collection of allowed adapter types for loading. */
  types = ['message', 'nlu', 'storage']

  /** Collection of loaded adapters. */
  loaded: {
    [key: string]: Adapter | undefined
    message?: MessageAdapter,
    nlu?: NLUAdapter,
    storage?: StorageAdapter
  } = {}

  /** For outputting loaded adapters. */
  get names () {
    return Object.keys(this.loaded).map((key) => {
      return `${key}: ${this.loaded[key]!.name || 'unknown'}`
    })
  }

  /** Type Guard for loaded adapter instances. */
  isAdapter (obj: any): obj is Adapter {
    return (['name', 'bot', 'start', 'shutdown'].every((key) => {
      return (
        Object.getOwnPropertyNames(obj).includes(key) ||
        Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).includes(key)
      )
    }))
  }

  /** Require an adapter from node modules by package name. */
  fromModule (name: string) {
    logger.debug(`[adapter] loading adapter by name: '${name}'.`)
    try {
      const adapter = (require.main)
        ? require(require.resolve(name, { paths: require.main.paths }))
        : require(name)
      return adapter
    } catch (err) {
      if (/cannot find/i.test(err.message)) {
        logger.debug(`[adapter] could not find package by name.`)
      } else {
        logger.error('[adapter] failed loading due to internal error.')
        throw err
      }
    }
  }

  /** Require an adapter from a local file path. */
  fromPath (path: string) {
    logger.debug(`[adapter] loading adapter by path: ${path}`)
    const currentPath = process.cwd()
    const bBotPath = dirname(require.resolve('bbot/package.json', {
      paths: [currentPath]
    })) + '/lib'
    const modulesPath = resolve(currentPath, 'node_modules/bbot/lib')
    const resolver = {
      paths: [
        bBotPath,
        currentPath,
        modulesPath,
        'src',
        'lib',
        'packages/bbot/src',
        'packages/bbot/lib'
      ]
    }
    if (require.main) {
      resolver.paths = resolver.paths.concat(...require.main.paths)
    }
    try {
      const adapter = require(require.resolve(path, resolver))
      return adapter
    } catch (err) {
      logger.error(`[adapter] failed loading from path: ${err.message}`)
      throw err
    }
  }

  /**
   * Require adapter module from local path or NPM package.
   * If path is not a file path but just a package name, try requiring name.
   * Otherwise use path as given or name prefixed with internal package path.
   * Confirms that the required resource is actually an adapter.
   */
  load (path: string) {
    let exported
    if (!/^(\/|\.|\\)/.test(path)) {
      exported = this.fromModule(path)
      path = `./adapters/${path}`
    }
    if (typeof exported === 'undefined') {
      exported = this.fromPath(path)
    }
    if (typeof exported.use === 'undefined') {
      throw new Error(`Loaded adapter from ${path} has no '.use' method.`)
    }
    const instance = exported.use(bBot)
    if (!this.isAdapter(instance)) {
      throw new Error('Loaded adapter was instance of an invalid class.')
    }
    return instance
  }

  /** Load and register adapter against type */
  register (type: string, loadPath: string) {
    switch (type) {
      case 'message':
        this.loaded.message = this.load(loadPath) as MessageAdapter
        break
      case 'nlu':
        this.loaded.nlu = this.load(loadPath) as NLUAdapter
        break
      case 'storage':
        this.loaded.storage = this.load(loadPath) as StorageAdapter
        break
    }
  }

  /** Load configured adapters, but don't yet start them. */
  loadAll () {
    for (let type of this.types) {
      if (this.loaded[type]) continue // already loaded
      const adapterPath = config.get(`${type}-adapter`)
      if (adapterPath && adapterPath !== '') {
        try {
          this.register(type, adapterPath)
        } catch (err) {
          logger.error(err.message)
          throw new Error(`[adapter] failed to load all adapters`)
        }
      }
    }
  }

  /** Start each adapter concurrently, to resolve when all ready. */
  startAll () {
    return Promise.all(Object.keys(this.loaded).map((type) => {
      let adapter = this.loaded[type]
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
  shutdownAll () {
    return Promise.all(Object.keys(this.loaded).map((type) => {
      let adapter = this.loaded[type]
      if (adapter) {
        logger.debug(`[adapter] shutdown ${type} adapter: ${adapter.name}`)
        return Promise.resolve(adapter.shutdown())
      }
      return undefined
    }))
  }

  /** Unload adapters for resetting bot. */
  unloadAll () {
    for (let type in this.loaded) delete this.loaded[type]
  }
}

export const adapters = new AdapterController()

export default adapters
