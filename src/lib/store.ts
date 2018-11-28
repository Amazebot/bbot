import { util, adapter } from '.'

/**
 * Persistent store for non-operational data like state history.
 * Most methods require a storage adapter to be loaded.
 */
export namespace store {
  /** Set keys to remove from data before keep. */
  export const excludes = ['bot', 'server']

  /** Keep serial data in collection, via adapter (converted to objects). */
  export async function keep (collection: string, data: any) {
    if (!adapter.adapters.storage) return
    await adapter.adapters.storage.keep(collection, util.convert(data))
  }

  /** Query store for subset matching params, via adapter */
  export async function find (collection: string, params: any = {}) {
    if (!adapter.adapters.storage) {
      throw new Error('Storage `find` called without storage adapter')
    }
    return adapter.adapters.storage.find(collection, params)
  }

  /** Query store for single value matching params, via adapter */
  export async function findOne (collection: string, params: any) {
    if (!adapter.adapters.storage) {
      throw new Error('Storage `findOne` called without storage adapter')
    }
    return adapter.adapters.storage.findOne(collection, params)
  }

  /** Remove anything from collection in storage that matches params */
  export async function lose (collection: string, params: any) {
    if (!adapter.adapters.storage) {
      throw new Error('Storage `lose` without storage adapter')
    }
    await adapter.adapters.storage.lose(collection, params)
  }
}
