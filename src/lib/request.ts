import * as client from 'request'
import * as bot from '..'

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

/** HTTP/S request handler, promisifies request callbacks */
export function request (
  opts: client.CoreOptions & client.OptionsWithUri
): Promise<any> {
  bot.logger.info(`[request] ${opts.method} ${opts.uri} ${(opts.body || opts.qs)
    ? 'with data (' + Object.keys(opts.body || opts.qs).join(', ') + ')'
    : 'without data'
  }`)
  return new Promise((resolve, reject) => {
    opts.callback = (err: Error, res: client.Response, body: any) => {
      const result = res && res.statusCode ? res.statusCode : 'unknown'
      if (err) {
        bot.logger.error(`[request] GET ${result} error ${err.message}`)
        return reject(err)
      }
      if (Buffer.isBuffer(body)) {
        return reject('[request] GET body was buffer (HTML, not JSON)')
      }
      const data = (opts.json) ? body : JSON.parse(body)
      const keys = Object.keys(data).join(', ')
      bot.logger.info(`[request] GET ${result} success (${keys})`)
      resolve(data)
    }
    if (!opts.method || opts.method === 'GET') client.get(opts)
    else if (opts.method === 'POST') client.post(opts)
    else if (opts.method === 'PUT') client.put(opts)
    else if (opts.method === 'PATCH') client.patch(opts)
    else if (opts.method === 'DELETE') client.del(opts)
    else if (opts.method === 'HEAD') client.head(opts)
  })
}

/** GET request handler, adds data to query string with default options */
export function getRequest (
  url: string,
  data = {},
  options?: client.CoreOptions & client.Options
) {
  const opts: client.OptionsWithUri = {
    method: 'GET',
    uri: url,
    qs: data
  }
  if (options) Object.assign(opts, options)
  return request(opts)
}

/** POST request handler, adds data to body with default options */
export function postRequest (
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
  return request(opts)
}
