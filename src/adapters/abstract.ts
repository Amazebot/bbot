import { Bot } from '../bot'
import * as envelope from '../components/envelope'
import * as message from '../components/message'
import * as nlu from '../components/nlu'

/** Adapter base class, extended for different types of adapters. */
export abstract class Adapter {
  /** Name of adapter, used for logs */
  name = 'base-adapter'

  /**
   * Create an adapter instance.
   * Adapter modules should export a `use` method that accepts the bot, to
   * provide to their adapter class constructor, returning the instance.
   */
  constructor (public bot: Bot) {}

  /** Extend to add any bot startup requirements in adapter environment */
  abstract start (): Promise<void>

  /** Extend to add any bot shutdown requirements in adapter environment */
  abstract shutdown (): Promise<void>
}

/** Message Adapter class, extended to connect bBot with messaging platform. */
export abstract class Message extends Adapter {
  name = 'message-adapter'

  /** Open connection to messaging platform */
  abstract start (): Promise<void>

  /** Close connection to messaging platform */
  abstract shutdown (): Promise<void>

  /** Take dispatched envelope to action in platform */
  abstract dispatch (envelope: envelope.Envelope): Promise<any>
}

/** NLU adapter class, extended to connect bBot with NLU platform. */
export abstract class NLU extends Adapter {
  name = 'nlu-adapter'

  /** Open connection to messaging platform */
  abstract start (): Promise<void>

  /** Close connection to messaging platform */
  abstract shutdown (): Promise<void>

  /** Add NLU results from NLP platform analysis */
  abstract process (msg: message.Text): Promise<nlu.ResultsRaw | undefined>
}

/**
 * Storage adapter class, extended to connect brain with external storage
 * provider. Methods are just raw endpoints to be extended.
 */
export abstract class Storage extends Adapter {
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
