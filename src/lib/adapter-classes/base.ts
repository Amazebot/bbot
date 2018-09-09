import * as bBot from '../..'

/** Base Adapter class, extending to create different types of adapters. */
export abstract class Adapter {
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

  /**
   * Utility to convert internal object to schema required in adapter platform.
   * Passing the original internal object as the external, allows inheriting
   * all attributes without needing to map the ones that are the same in both.
   * Otherwise, result would only include values from defined schema fields.
   */
  parseSchema (
    internal: any,
    schema: { [path: string]: string },
    external: any = {}
  ) {
    const converted: any = {}
    const target = (external.constructor.name !== 'Object')
      ? Object.create(external)
      : this.bot.deepClone(external)
    for (let key in schema) {
      const valueAtPath = schema[key].split('.').reduce((pre, cur) => {
        return (typeof pre !== 'undefined') ? pre[cur] : undefined
      }, internal)
      if (typeof valueAtPath !== 'undefined') {
        converted[key] = valueAtPath
        delete target[schema[key]] // remove anything re-mapped
      }
    }
    return Object.assign(target, converted)
  }
}
