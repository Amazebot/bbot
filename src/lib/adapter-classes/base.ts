/** Base Adapter class, extending to create different types of adapters. */
export abstract class Adapter {
  /** Index signature allows methods method to get methods */
  [key: string]: any

  /** Name of adapter, used for logs */
  name = 'base-adapter'

  /**
   * Create an adapter instance.
   * External adapter packages should provide a `.use` method that accepts the
   * bot, to provide to their adapter class constructor, returning the instance.
   * @param bot The current bBot instance
   */
  constructor (public bot: any) {}

  /** Extend to add any bot startup requirements in adapter environment */
  async start () {
    this.bot.logger.info('[adapter] `start` called without override')
  }

  /** Extend to add any bot shutdown requirements in adapter environment */
  async shutdown () {
    this.bot.logger.info('[adapter] `shutdown` called without override')
  }
}
