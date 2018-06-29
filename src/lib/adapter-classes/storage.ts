import { Adapter } from './base'

/**
 * Storage adapter class, extended to connect brain with external storage
 * provider. Methods are just raw endpoints to be extended.
 */
export abstract class StorageAdapter extends Adapter {
  name = 'storage-adapter'

  /** Open connection to storage provider */
  abstract async start (): Promise<void>

  /** Close connection to storage provider */
  abstract async shutdown (): Promise<void>

  /** Store memory data from brain */
  abstract async saveMemory (data: any): Promise<void>

  /** Get memory data for brain */
  abstract async loadMemory (): Promise<any>

  /** Add data to series in given collection */
  abstract async keep (collection: string, data: any): Promise<void>

  /** Query subset of collection from storage provider */
  abstract async find (collection: string, params: any): Promise<any>

  /** Query subset of collection from storage provider, returning single item */
  abstract async findOne (collection: string, params: any): Promise<any>

  /** Remove anything from collection in storage that matches params */
  abstract async lose (collection: string, params: any): Promise<void>
}
