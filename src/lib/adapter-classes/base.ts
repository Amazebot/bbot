import * as bBot from '../..'

/** Base Adapter class, extending to create different types of adapters. */
export abstract class Adapter {
  /** Index signature allows methods method to get methods */
  [key: string]: any

  /** Name of adapter, used for logs */
  name = 'base-adapter'

  /**
   * Create an adapter instance.
   * Adapter modules should provide a `.use` method that accepts the bot, to
   * provide to their adapter class constructor, returning the instance.
   * @param bot The current bBot instance
   */
  constructor (public bot: typeof bBot) {}

  /** Extend to add any bot startup requirements in adapter environment */
  abstract start (): Promise<void>

  /** Extend to add any bot shutdown requirements in adapter environment */
  abstract shutdown (): Promise<void>
}
