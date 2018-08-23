import * as bot from '..'

/**
 * Persistent store for non-operational data like state history.
 * Most methods require a storage adapter to be loaded.
 */
export class Store {
  /** Set keys to remove from data before keep. */
  excludes: string[] = ['bot']

  /** Convert instance to plain object for storage. */
  plainObject (data: any) {
    if (typeof data === 'object') {
      data = bot.deepClone(Object.keys(data)
        .filter((key) => !this.excludes.includes(key))
        .reduce((obj: any, key) => {
          if (typeof obj[key] !== 'function') obj[key] = data[key]
          return obj
        }, {})
      )
    }
    return data
  }

  /** Keep serial data in collection, via adapter (converted to objects). */
  async keep (collection: string, data: any) {
    if (!bot.adapters.storage) return
    await bot.adapters.storage.keep(collection, this.plainObject(data))
  }

  /** Query store for subset matching params, via adapter */
  async find (collection: string, params: any = {}) {
    if (!bot.adapters.storage) {
      throw new Error('Storage `find` called without storage adapter')
    }
    return bot.adapters.storage.find(collection, params)
  }

  /** Query store for single value matching params, via adapter */
  async findOne (collection: string, params: any) {
    if (!bot.adapters.storage) {
      throw new Error('Storage `findOne` called without storage adapter')
    }
    return bot.adapters.storage.findOne(collection, params)
  }

  /** Remove anything from collection in storage that matches params */
  async lose (collection: string, params: any) {
    if (!bot.adapters.storage) {
      throw new Error('Storage `lose` without storage adapter')
    }
    await bot.adapters.storage.lose(collection, params)
  }
}

export const store = new Store()
