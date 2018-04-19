/** Base Adapter class, extending to create different types of adapters. */
export abstract class Adapter {
  /** Name of adapter, used for logs */
  name = 'base-adapter'
  /**
   * Create an adapter instance.
   * External adapter packages should provide a `.use` method that accepts the
   * bot, to provide to their adapter class constructor, returning the instance.
   * @param bot The current bBot instance
   */
  constructor (public bot: any) {}
  async start () {
    this.bot.logger.info('Generic adapter `start` called without override')
  }
  async shutdown () {
    this.bot.logger.info('Generic adapter `shutdown` called without override')
  }
}
