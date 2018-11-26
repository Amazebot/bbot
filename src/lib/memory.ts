import * as bot from '..'

/** Magic function to un-weird weird things. */
export const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj))

/** Save tracking vars */
export const intervals: {
  save: {
    timer?: NodeJS.Timer,
    value: number
  }
} = { save: { value: 5000 } }

/** Internal storage for data, can hold any key/value collection. */
export class Memory {
  /** Index signature allows any key value pair to be added to memory. */
  [key: string]: any

  /** All known users assigned to their ID as key. */
  users: { [id: string]: bot.User }

  /** Any misc data added without specifying collection. */
  private: { [key: string]: any }

  /** Create a memory instance for isolating users, key/value pairs. */
  constructor () {
    this.users = {}
    this.private = {}
  }

  /** Convert memory to an object with collection attributes. */
  toObject () {
    return bot.store.plainObject(this)
  }

  /** Empty memory and start fresh with minimal empty collections. */
  clear () {
    for (let key of Object.keys(memory)) delete memory[key]
    this.users = {}
    this.private = {}
  }

  /** Save internal memory back to storage adapter (as `memory` type). */
  async save () {
    if (!bot.adapters.storage) return
    this.clearSaveInterval() // don't save while saving
    await bot.adapters.storage.saveMemory(memory)
    this.setSaveInterval() // start saving again
  }

  /** Update internal memory with any data set (mostly used on load) */
  async load () {
    if (!bot.adapters.storage) {
      bot.logger.warn(`[memory] cannot load or persist data without storage adapter.`)
      return
    }
    const loaded = await bot.adapters.storage.loadMemory()
    for (let key in loaded) {
      this[key] = Object.assign({}, this[key], loaded[key])
    }
  }

  /** Save memory every x milliseconds */
  setSaveInterval (newInterval?: number) {
    if (newInterval) intervals.save.value = newInterval
    if (!bot.adapters.storage || !bot.settings.get('autoSave')) return
    intervals.save.timer = global.setInterval(
      () => this.save(),
      intervals.save.value
    )
  }

  /** Retrieve value from memory by key within given (or default) collection. */
  get (key: string, collection: string = 'private') {
    return this[collection][key]
  }

  /** Remove item from memory by key and collection namespace (optional). */
  unset (key: string, collection: string = 'private') {
    delete memory[collection][key]
    return bot
  }

  /** Stop saving data */
  clearSaveInterval () {
    if (intervals.save.timer) global.clearInterval(intervals.save.timer)
  }

  /**
   * Save key-value pair under the collection namespace, extend existing data.
   * Set is used for temporal in-memory data for common interactions. For large
   * data sets that will be infrequently accessed, use `keep` instead.
   */
  set (key: string, value: any, collection: string = 'private') {
    const data = deepClone(value)
    if (!this[collection]) this[collection] = {}
    this[collection][key] = data
    bot.events.emit('loaded', this)
    return bot
  }

  /** Populate brian with temporal data from storage adapter and get started */
  async start () {
    if (!bot.adapters.storage) return
    await this.load()
    this.setSaveInterval()
    if (bot.settings.get('auto-save')) {
      const sec = (intervals.save.value / 1000).toFixed(2)
      bot.logger.info(`[memory] auto save is enabled, every ${sec} seconds.`)
    }
  }

  /** Save data and disconnect storage adapter */
  async shutdown () {
    await this.save()
    this.clearSaveInterval()
    bot.logger.info(`[memory] saving is disabled`)
  }
}

export const memory = new Memory()

/**
 * Get a user by ID.
 * If found and given meta, updates and returns updated user.
 * if given meta and ID not found, creates new user.
 */
export function userById (id: string, meta?: any) {
  let saved: bot.User = memory.users[id]
  const updated = Object.assign({}, { id }, saved, meta)
  const user = new bot.User(updated)
  memory.users[id] = user
  return user
}

/** Get users by their name. */
export function usersByName (name: string) {
  let users: bot.User[] = []
  for (let id in memory.users) {
    let user: bot.User = memory.users[id]
    if (user.name && user.name.toLowerCase() === name.toLowerCase()) {
      users.push(user)
    }
  }
  return users
}

/** Get all users in memory */
export function users () {
  return memory.users
}
