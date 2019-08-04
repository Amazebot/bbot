import { Bot } from '../../../bot'

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
