import * as bot from '..'

/** Magic function to un-weird weird things */
const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj))

/** Save tracking vars */
export let saveInterval: NodeJS.Timer
export let saveIntervalValue: number = 5000

/** Set keys to remove from data before keep */
export const keepExcludes = ['bot']

/** Internal storage for brain data, can hold any key/value collection */
export const memory: {
  [key: string]: any
  users: { [id: string]: bot.User },
  private: { [key: string]: any }
} = {
  users: {}, // all known users assigned to their ID as key
  private: {} // any misc data added without specifying collection
}

/** Empty the brain and start fresh with minimal empty collections */
export function clearMemory () {
  for (let key in memory) delete memory[key]
  memory.users = {}
  memory.private = {}
}

/** Save internal memory back to storage adapter (as `memory` type) */
export async function saveMemory () {
  if (!bot.adapters.storage) return
  bot.events.emit('save', memory)
  bot.clearSaveInterval() // don't save while saving
  await bot.adapters.storage.saveMemory(memory)
  bot.setSaveInterval() // start saving again
}

/** Update internal memory with any data set (mostly used on load) */
export async function loadMemory () {
  if (!bot.adapters.storage) {
    bot.logger.warn(`[brain] cannot load or persist data without storage adapter.`)
    return
  }
  const loaded = await bot.adapters.storage.loadMemory()
  for (let key in loaded) {
    memory[key] = Object.assign({}, memory[key], loaded[key])
  }
}

/** Save brain memory every x milliseconds */
export function setSaveInterval (newInterval?: number) {
  if (newInterval) saveIntervalValue = newInterval
  if (!bot.adapters.storage || !bot.config.autoSave) return
  saveInterval = setInterval(() => bot.saveMemory(), saveIntervalValue)
}

/** Stop saving brain data */
export function clearSaveInterval () {
  if (saveInterval) clearInterval(saveInterval)
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

/** Keep serial data in collection, via adapter (converted to plain objects) */
export async function keep (collection: string, data: any) {
  if (!bot.adapters.storage) return
  if (typeof data === 'object') {
    data = deepClone(Object.keys(data)
      .filter((key) => !keepExcludes.includes(key))
      .reduce((obj: any, key) => {
        if (typeof obj[key] !== 'function') obj[key] = data[key]
        return obj
      }, {})
    )
  }
  await bot.adapters.storage.keep(collection, data)
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
export async function loadBrain () {
  if (!bot.adapters.storage) return
  await bot.adapters.storage.start()
  await bot.loadMemory()
  bot.setSaveInterval()
}

/** Save data and disconnect storage adapter */
export async function unloadBrain () {
  await bot.saveMemory()
  bot.clearSaveInterval()
  if (bot.adapters.storage) bot.adapters.storage.shutdown()
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
export function usersByName (name: string): bot.User[] {
  let users: bot.User[] = []
  for (let id in memory.users) {
    let user: bot.User = memory.users[id]
    if (user.name && user.name.toLowerCase() === name.toLowerCase()) {
      users.push(user)
    }
  }
  return users
}
