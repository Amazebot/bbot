/**
 * Setup temporary in-memory stores for method results, for adapters.
 * @module components/cache
 */

import LRU from 'lru-cache'
import logger from '../util/logger'

/** Cache method calls for any class instance for configured duration/size. */
export class Cache {
  results: Map<string, LRU.Cache<string, any>> = new Map()
  defaults: LRU.Options = { max: 100, maxAge: 300 * 1000 }

  /**
   * Provide instance for this class to initialise caching it's methods.
   * @param instance Instance of a class to cache method calls
   */
  constructor (private instance: any) {}

  /**
   * Setup a cache for a method call.
   * @param method Method name, for index of cached results
   * @param options.max Maximum size of cache
   * @param options.maxAge Maximum age of cache
   */
  setup (method: string, options: LRU.Options = {}) {
    options = Object.assign(this.defaults, options)
    this.results.set(method, new LRU(options))
    return this.results.get(method)!
  }

  /**
   * Get results of a prior method call or call and cache.
   * @param method Method name, to call on instance in use
   * @param key Key to pass to method call and save results against
   */
  call (method: string, key: string) {
    const methodCache = this.results.get(method) || this.setup(method)
    let callResults

    if (methodCache.has(key)) {
      logger.debug(`[${method}] Calling (cached): ${key}`)
      // return from cache if key has been used on method before
      callResults = methodCache.get(key)
    } else {
      // call and cache for next time, returning results
      logger.debug(`[${method}] Calling (caching): ${key}`)
      callResults = this.instance.call(method, key).result
      methodCache.set(key, callResults)
    }
    return Promise.resolve(callResults)
  }

  /**
   * Proxy for checking if method has been cached.
   * Cache may exist from manual creation, or prior call.
   * @param method Method name for cache to get
   */
  has (method: string): boolean {
    return this.results.has(method)
  }

  /** Proxy for set */
  set (method: string, key: string, value: any) {
    if (!this.results.has(method)) this.setup(method) // create on use
    return this.results.get(method)!.set(key, value)
  }

  /**
   * Get results of a prior method call.
   * @param method Method name for cache to get
   * @param key Key for method result set to return
   */
  get (method: string, key: string) {
    if (this.results.has(method)) return this.results.get(method)!.get(key)
  }

  /**
   * Reset a cached method call's results (all or only for given key).
   * @param method Method name for cache to clear
   * @param key Key for method result set to clear
   */
  reset (method: string, key?: string) {
    if (this.results.has(method)) {
      if (key) return this.results.get(method)!.del(key)
      else return this.results.get(method)!.reset()
    }
  }

  /** Reset cached results for all methods. */
  resetAll () {
    this.results.forEach((cache) => cache.reset())
  }
}

/** Access cache constructor. */
export class CacheController {
  Cache = Cache
  created: Cache[] = []
  create = (instance: any) => {
    const cache = new this.Cache(instance)
    this.created.push(cache)
    return cache
  }
  reset = () => this.created.map((c) => c.resetAll())
}

export const caches = new CacheController()

export default caches
