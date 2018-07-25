import { Adapter } from './base'

/**
 * Storage adapter class, extended to connect brain with external storage
 * provider. Methods are just raw endpoints to be extended.
 */
export abstract class StorageAdapter extends Adapter {
  name = 'storage-adapter'

  /** Open connection to storage provider */
  abstract start (): Promise<void>

  /** Close connection to storage provider */
  abstract shutdown (): Promise<void>

  /** Store memory data from brain */
  abstract saveMemory (data: any): Promise<void>

  /** Get memory data for brain */
  abstract loadMemory (): Promise<any>

  /** Add data to series in given collection */
  abstract keep (collection: string, data: any): Promise<void>

  /** Query subset of collection from storage provider */
  abstract find (collection: string, params: any): Promise<any>

  /** Query subset of collection from storage provider, returning single item */
  abstract findOne (collection: string, params: any): Promise<any>

  /** Remove anything from collection in storage that matches params */
  abstract lose (collection: string, params: any): Promise<void>
}
