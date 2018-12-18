import { resolve } from 'path'
import logger from './logger'
import config from './config'
import bBot from '../bot'
import * as abstract from '../adapters/abstract'

/** Loads adapters and initialises adapters. */
export class AdapterController {
  /** Make all abstract classes available for extension. */
  abstract = abstract

  /** Collection of allowed adapter types for loading. */
  types = ['message', 'nlu', 'storage']

  /** Collection of loaded adapters. */
  loaded: {
    [key: string]: abstract.Adapter | undefined
    message?: abstract.MessageAdapter,
    nlu?: abstract.NLUAdapter,
    storage?: abstract.StorageAdapter
  } = {}

  /** For outputting loaded adapters. */
  get names () {
    return Object.keys(this.loaded).map((key) => {
      return this.loaded[key]!.name
    })
  }

  /** Type Guard for loaded adapter instances. */
  isAdapter (obj: any): obj is abstract.Adapter {
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
      return (require(require.resolve(path, resolver)))
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
        this.loaded.message = this.load(loadPath) as abstract.MessageAdapter
        break
      case 'nlu':
        this.loaded.nlu = this.load(loadPath) as abstract.NLUAdapter
        break
      case 'storage':
        this.loaded.storage = this.load(loadPath) as abstract.StorageAdapter
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
