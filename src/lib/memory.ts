import * as bot from '..'

/** Magic function to un-weird weird things */
const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj))

/** Save tracking vars */
export const intervals: {
  save: {
    timer?: NodeJS.Timer,
    value: number
  }
} = { save: { value: 5000 } }

/** Set keys to remove from data before keep */
export const keepExcludes = ['bot']

/** Internal storage for data, can hold any key/value collection */
export const memory: {
  [key: string]: any
  users: { [id: string]: bot.User },
  private: { [key: string]: any }
} = {
  users: {}, // all known users assigned to their ID as key
  private: {} // any misc data added without specifying collection
}

/** Empty memory and start fresh with minimal empty collections */
export function clearMemory () {
  for (let key in memory) delete memory[key]
  memory.users = {}
  memory.private = {}
}

/** Save internal memory back to storage adapter (as `memory` type) */
export async function saveMemory () {
  if (!bot.adapters.storage) return
  bot.clearSaveInterval() // don't save while saving
  await bot.adapters.storage.saveMemory(memory)
  bot.setSaveInterval() // start saving again
}

/** Update internal memory with any data set (mostly used on load) */
export async function loadMemory () {
  if (!bot.adapters.storage) {
    bot.logger.warn(`[memory] cannot load or persist data without storage adapter.`)
    return
  }
  const loaded = await bot.adapters.storage.loadMemory()
  for (let key in loaded) {
    memory[key] = Object.assign({}, memory[key], loaded[key])
  }
}

/** Save memory every x milliseconds */
export function setSaveInterval (newInterval?: number) {
  if (newInterval) intervals.save.value = newInterval
  if (!bot.adapters.storage || !bot.settings.get('autoSave')) return
  intervals.save.timer = global.setInterval(
    () => bot.saveMemory(),
    intervals.save.value
  )
}

/** Stop saving data */
export function clearSaveInterval () {
  if (intervals.save.timer) global.clearInterval(intervals.save.timer)
}

/**
 * Save key-value pair under the collection namespace, extend existing data.
 * Set is used for temporal in-memory data for common interactions. For large
 * data sets that will be infrequently accessed, use `keep` instead.
 */
export function set (key: string, value: any, collection: string = 'private') {
  const data = deepClone(value)
  if (!memory[collection]) memory[collection] = {}
  memory[collection][key] = Object.assign({}, memory[collection][key], data)
  bot.events.emit('loaded', memory)
  return bot
}

/** Retrieve value from memory by key within given (or default) collection. */
export function get (key: string, collection: string = 'private') {
  return memory[collection][key]
}

/** Remove item from memory by key and collection namespace (optional). */
export function unset (key: string, collection: string = 'private') {
  delete memory[collection][key]
  return bot
}

/** Convert instance to plain object for storage */
export function convertInstance (data: any) {
  if (typeof data === 'object') {
    data = deepClone(Object.keys(data)
      .filter((key) => !keepExcludes.includes(key))
      .reduce((obj: any, key) => {
        if (typeof obj[key] !== 'function') obj[key] = data[key]
        return obj
      }, {})
    )
  }
  return data
}

/** Keep serial data in collection, via adapter (converted to plain objects) */
export async function keep (collection: string, data: any) {
  if (!bot.adapters.storage) return
  await bot.adapters.storage.keep(collection, convertInstance(data))
}

/** Query store for subset matching params, via adapter */
export async function find (collection: string, params: any = {}) {
  if (!bot.adapters.storage) {
    throw new Error('Storage `find` called without storage adapter')
  }
  return bot.adapters.storage.find(collection, params)
}

/** Query store for single value matching params, via adapter */
export async function findOne (collection: string, params: any) {
  if (!bot.adapters.storage) {
    throw new Error('Storage `findOne` called without storage adapter')
  }
  return bot.adapters.storage.findOne(collection, params)
}

/** Remove anything from collection in storage that matches params */
export async function lose (collection: string, params: any) {
  if (!bot.adapters.storage) {
    throw new Error('Storage `lose` without storage adapter')
  }
  await bot.adapters.storage.lose(collection, params)
}

/** Populate brian with temporal data from storage adapter and get started */
export async function startMemory () {
  if (!bot.adapters.storage) return
  await bot.loadMemory()
  bot.setSaveInterval()
  if (bot.settings.get('auto-save')) {
    const sec = (intervals.save.value / 1000).toFixed(2)
    bot.logger.info(`[memory] auto save is enabled, every ${sec} seconds.`)
  }
}

/** Save data and disconnect storage adapter */
export async function shutdownMemory () {
  await bot.saveMemory()
  bot.clearSaveInterval()
  bot.logger.info(`[memory] saving is disabled`)
}

/** Shortcut to get the user collection from memory */
export function users () {
  return memory.users
}

/**
 * Get a User object by ID.
 * If found and given meta, overwrites and returns updated user.
 * if given meta and ID not found, creates new user.
 */
export function userById (id: string, meta?: any) {
  let user: bot.User = memory.users[id]
  if (!user || meta) {
    user = new bot.User(Object.assign({}, { id }, meta))
    memory.users[id] = user
  }
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
