/**
 * Persistent store for non-operational data like state history.
 * @module components/store
 */

import { convert } from '../util/instance'
import adapters from './adapter'

/** Storage controller, methods require a storage adapter to be loaded. */
export class StorageController {
  /** Keep serial data in collection, via adapter (converted to objects). */
  async keep (collection: string, data: any) {
    if (!adapters.loaded.storage) return
    await adapters.loaded.storage.keep(collection, convert(data))
  }

  /** Query store for subset matching params, via adapter */
  async find (collection: string, params: any = {}) {
    if (!adapters.loaded.storage) {
      throw new Error('Storage `find` called without storage adapter')
    }
    return adapters.loaded.storage.find(collection, params)
  }

  /** Query store for single value matching params, via adapter */
  async findOne (collection: string, params: any) {
    if (!adapters.loaded.storage) {
      throw new Error('Storage `findOne` called without storage adapter')
    }
    return adapters.loaded.storage.findOne(collection, params)
  }

  /** Remove anything from collection in storage that matches params */
  async lose (collection: string, params: any) {
    if (!adapters.loaded.storage) {
      throw new Error('Storage `lose` without storage adapter')
    }
    await adapters.loaded.storage.lose(collection, params)
  }
}

export const store = new StorageController()

export default store
