import { Adapter } from './base'

/**
 * Storage adapter class, extended to connect brain with external storage
 * provider. Methods are just raw endpoints to be extended.
 * @todo Define return types for `lose` and `keep` to indicate success or count
 */
export abstract class StorageAdapter extends Adapter {
  name = 'storage-adapter'

  /** Store memory data from brain */
  async saveMemory (data: any) {
    this.bot.logger.debug('[storage-adapter] `saveMemory` called without override', {
      data
    })
  }

  /** Get memory data for brain */
  async loadMemory () {
    this.bot.logger.debug('[storage-adapter] `loadMemory` called without override')
  }

  /** Add data to series in given collection */
  async keep (
    collection: string,
    data: any
  ): Promise<void> {
    this.bot.logger.debug('[storage-adapter] `keep` called without override', {
      collection,
      data
    })
  }

  /** Query subset of collection from storage provider */
  async find (
    collection: string,
    params: any
  ): Promise<any | undefined> {
    this.bot.logger.debug('[storage-adapter] `find` called without override', {
      collection,
      params
    })
  }

  /** Query subset of collection from storage provider, returning single item */
  async findOne (
    collection: string,
    params: any
  ): Promise<any | undefined> {
    this.bot.logger.debug('[storage-adapter] `findOne` called without override', {
      collection,
      params
    })
  }

  /** Remove anything from collection in storage that matches params */
  async lose (
    collection: string,
    params: any
  ): Promise<void> {
    this.bot.logger.debug('[storage-adapter] `lose` called without override', {
      collection,
      params
    })
  }
}
