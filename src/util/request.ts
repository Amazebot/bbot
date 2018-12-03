/**
 * Make HTTP/s requests to external services.
 * @module util/request
 */

import * as client from 'request'
import config from './config'
import logger from './logger'

/** Standard arguments object for requests */
export interface IRequestMeta {
  data?: any
  json?: boolean
  auth?: {
    user: string,
    pass: string,
    sendImmediately?: boolean,
    bearer?: string
  }
  headers?: { [name: string]: string }
}

/** Create a promise wrapper, that rejects if timeout met before resolved */
function timeoutPromise (ms: number, promise: Promise<any>) {
  let timeout = new Promise((_, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id)
      reject(new Error(`[request] Timed out in ${ms}ms.`))
    }, ms)
  })
  return Promise.race([promise, timeout])
}

/** HTTP/S request handler, promisify request callbacks */
export class Request {

  /**
   * Create a custom request, with method and other options in Node requests.
   * Note, requests do not throw or need catching, to avoid a common occurrence
   * that would crash the bot. Instead they log errors and return undefined.
   */
  make (
    opts: client.CoreOptions & client.OptionsWithUri
  ): Promise<any> {
    logger.info(`[request] ${opts.method} ${opts.uri} ${(opts.body || opts.qs)
      ? 'with data (' + Object.keys(opts.body || opts.qs).join(', ') + ')'
      : 'without data'
    }`)
    const requestPromise = new Promise((resolve, reject) => {
      opts.callback = (err, res, body) => {
        const result = res && res.statusCode ? res.statusCode : 'unknown'
        if (err) {
          logger.error(`[request] ${opts.method} error ${err.code}`)
          return reject(err)
        }
        if (Buffer.isBuffer(body)) {
          return reject(new Error(`[request] ${opts.method} error, body is buffer, not JSON`))
        }
        try {
          if (typeof body !== 'undefined' && body !== '') {
            const data = (opts.json) ? body : JSON.parse(body)
            const keys = Object.keys(data).join(', ')
            logger.info(`[request] ${opts.method} ${result} success (${keys})`)
            resolve(data)
          } else {
            logger.info(`[request] ${opts.method} ${result} success (null body)`)
            resolve()
          }
        } catch (err) {
          logger.error(`[request] ${opts.method} error parsing body: ${err.message}`)
          reject(err)
        }
      }
      if (!opts.method || opts.method === 'GET') client.get(opts)
      else if (opts.method === 'POST') client.post(opts)
      else if (opts.method === 'PUT') client.put(opts)
      else if (opts.method === 'PATCH') client.patch(opts)
      else if (opts.method === 'DELETE') client.del(opts)
      else if (opts.method === 'HEAD') client.head(opts)
    })
    return timeoutPromise(config.get('request-timeout'), requestPromise)
  }

  /** GET request handler, adds data to query string with default options */
  get (
    url: string,
    data?: any,
    options?: client.CoreOptions & client.Options
  ) {
    const opts: client.OptionsWithUri = {
      method: 'GET',
      uri: url,
      qs: data
    }
    if (options) Object.assign(opts, options)
    return this.make(opts)
  }

  /** POST request handler, adds data to body with default options */
  post (
    url: string,
    data = {},
    options?: client.CoreOptions & client.Options
  ) {
    const opts: client.OptionsWithUri = {
      method: 'POST',
      uri: url,
      body: data,
      json: true
    }
    if (options) Object.assign(opts, options)
    return this.make(opts)
  }
}

export const request = new Request()
