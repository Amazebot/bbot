import { resolve, dirname } from 'path'
import { Adapter, MessageAdapter, NLUAdapter, StorageAdapter } from './class'
import { logger } from '../../util'

/** Loads and initialise different adapter types. */
export class AdapterController {
  /** Define loadable adapter classes. */
  slots: {
    [key: string]: Adapter | undefined
    message?: MessageAdapter
    nlu?: NLUAdapter
    storage?: StorageAdapter
  } = {}

  /** Create adapter controller for bot instance. */
  constructor (private _: {
    getAdapterPath: (type: string) => string
  }) {}

  /** String for logging/sending loaded adapter names. */
  get names () {
    return Object.keys(this.slots).map((type) => {
      return `${type}: ${this.slots[type]!.name || 'unknown'}`
    })
  }

  /** Key/values for bot's configured adapter paths. */
  get paths () {
    return {
      message: this._.getAdapterPath('message'),
      nlu: this._.getAdapterPath('nlu'),
      storage: this._.getAdapterPath('storage')
    }
  }

  /** Type guard for loaded adapter instances. */
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

  /**
   * Require an adapter from a local file path.
   * Tries a variety of possible locations relative to the current node process,
   * to allow flexibility for running as or with a dependency, or in sand-boxed
   * test environment (like Wallaby.js).
   */
  fromPath (path: string) {
    logger.debug(`[adapter] loading adapter by path: ${path}`)
    const currentPath = process.cwd()
    let bBotPath = dirname(__dirname) + '/lib'
    try {
      bBotPath = dirname(require.resolve('bbot/package.json', {
        paths: [currentPath]
      })) + '/lib'
    } catch (err) { /* ignore */ }
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
    const instance = exported.use(this.bot)
    if (!this.isAdapter(instance)) {
      throw new Error('Loaded adapter was instance of an invalid class.')
    }
    return instance
  }

  /** Load configured adapters, but don't yet start them. */
  loadAll () {
    if (typeof this.slots.message !== 'undefined') {
      this.slots.message = this.load(this.paths.message) as MessageAdapter
    }
    if (typeof this.slots.nlu !== 'undefined') {
      this.slots.nlu = this.load(this.paths.nlu) as NLUAdapter
    }
    if (typeof this.slots.storage !== 'undefined') {
      this.slots.storage = this.load(this.paths.storage) as StorageAdapter
    }
  }

  /** Load adapter in slot by type key. */
  start (type: string) {
    if (typeof this.slots[type] !== 'undefined') {
      return this.slots[type]!.start()
    }
    logger.debug(`[adapter] no ${type} type adapter defined`)
  }

  /** Start each adapter concurrently, to resolve when all ready. */
  startAll () {
    return Promise.all(Object.keys(this.slots).map((type) => {
      return this.start(type)
    }))
  }

  /** Run shutdown on adapter in slot by type key. */
  shutdown (type: string) {
    if (typeof this.slots[type] !== 'undefined') {
      return this.slots[type]!.shutdown()
    }
    logger.debug(`[adapter] no ${type} type adapter defined`)
  }

  /** Run shutdown on each adapter concurrently, to resolve when all shutdown */
  shutdownAll () {
    return Promise.all(Object.keys(this.slots).map((type) => {
      return this.shutdown(type)
    }))
  }

  /** Unload adapters for resetting bot. */
  unloadAll () {
    for (let type in this.slots) delete this.slots[type]
  }
}

export default AdapterController
