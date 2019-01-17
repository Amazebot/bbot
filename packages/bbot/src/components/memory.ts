/**
 * Store and retrieve data from internal or external storage.
 * @module components/memory
 */

import { convert, clone } from '../util/instance'
import config from '../util/config'
import logger from '../util/logger'
import adapters from './adapter'
import { User } from './user'
import { Room } from './room'

/** Keep interval length and timer together. */
export interface IInterval { timer?: NodeJS.Timer, value: number }

/** Keep save interval as external property to avoid being cleared. */
export const saveInterval: IInterval = { value: 5000 }

/** Internal storage for data, can hold any key/value collection. */
export class MemoryController {
  /** Index signature allows any key value pair to be added to memory. */
  [key: string]: any

  /** All known users assigned to their ID as key. */
  users: { [id: string]: User }

  /** All known rooms assigned to their ID as key. */
  rooms: { [id: string]: Room }

  /** Any misc data added without specifying collection. */
  private: { [key: string]: any }

  /** Create a memory instance for isolating users, key/value pairs. */
  constructor () {
    this.users = {}
    this.rooms = {}
    this.private = {}
  }

  /** Convert memory to an object with collection attributes. */
  toObject () {
    return convert(this)
  }

  /** Empty memory and start fresh with minimal empty collections. */
  clear () {
    for (let key of Object.keys(memory)) delete memory[key]
    this.users = {}
    this.rooms = {}
    this.private = {}
  }

  /** Save internal memory back to storage adapter (as `memory` type). */
  async save () {
    if (!adapters.loaded.storage) return
    this.clearSaveInterval() // don't save while saving
    await adapters.loaded.storage.saveMemory(memory)
    this.setSaveInterval() // start saving again
  }

  /** Update internal memory with any data set (mostly used on load) */
  async load () {
    if (!adapters.loaded.storage) {
      logger.warn(`[memory] cannot load or persist data without storage adapter.`)
      return
    }
    const loaded = await adapters.loaded.storage.loadMemory()
    for (let key in loaded) {
      this[key] = Object.assign({}, this[key], loaded[key])
    }
  }

  /** Save memory every x milliseconds */
  setSaveInterval (newInterval?: number) {
    if (newInterval) saveInterval.value = newInterval
    if (!adapters.loaded.storage || !config.get('autoSave')) return
    saveInterval.timer = global.setInterval(
      () => this.save(),
      saveInterval.value
    )
  }

  /** Retrieve value from memory by key within given (or default) collection. */
  get (key: string, collection: string = 'private') {
    return this[collection][key]
  }

  /** Remove item from memory by key and collection namespace (optional). */
  unset (key: string, collection: string = 'private') {
    delete memory[collection][key]
    return this
  }

  /** Stop saving data */
  clearSaveInterval () {
    if (saveInterval.timer) global.clearInterval(saveInterval.timer)
  }

  /**
   * Save key-value pair under the collection namespace, extend existing data.
   * Set is used for temporal in-memory data for common interactions. For large
   * data sets that will be infrequently accessed, use `keep` instead.
   */
  set (key: string, value: any, collection: string = 'private') {
    const data = clone(value)
    if (!this[collection]) this[collection] = {}
    this[collection][key] = data
    return this
  }

  /** Populate brian with temporal data from storage adapter and get started */
  async start () {
    if (!adapters.loaded.storage) return
    await this.load()
    this.setSaveInterval()
    if (config.get('auto-save')) {
      const sec = (saveInterval.value / 1000).toFixed(2)
      logger.info(`[memory] auto save is enabled, every ${sec} seconds.`)
    }
  }

  /** Save data and disconnect storage adapter */
  async shutdown () {
    await this.save()
    this.clearSaveInterval()
    logger.info(`[memory] saving is disabled`)
  }
}

export const memory = new MemoryController()

export default memory
