/**
 * Serve bot data and custom routes and listen for incoming message data.
 * @module components/server
 */

import Koa from 'koa'
import koaBody from 'koa-body'
import Router from 'koa-router'
import http from 'http'
import https from 'https'
import { AddressInfo } from 'net'

import config from '../util/config'
import logger from '../util/logger'
import { messages } from './message'
import { thoughts } from './thought'
import { adapters } from './adapter'
import { middlewares } from './middleware'

/** Server states include Koa context, to respond to http/s requests. */
export interface IContext extends Router.IRouterContext {}

/** Load and start server to listen for data over HTTP/s */
export class ServerController {
  /** Koa app. */
  app: Koa

  /** Http/s server. */
  _server?: http.Server | https.Server

  /** Koa router. */
  router: Router

  /** Koa sub-router for request messages. */
  messageRouter: Router

  /** Served address. */
  info?: AddressInfo

  /** Timestamp for server startup. */
  started?: Date

  /** Create server and router instances (prior to load) */
  constructor () {
    this.app = new Koa()
    this.router = new Router()
    this.messageRouter = new Router()
  }

  /** Initialise server and router, adding logger middleware */
  load () {
    if (!config.get('use-server')) return
    this.app.use(koaBody())
    this.app.use(async (ctx, next) => {
      const start = new Date().getTime()
      await next()
      const ms = new Date().getTime() - start
      logger.info(`[server] served ${ctx.method} ${ctx.url} - ${ms}ms`)
      ctx.set('X-Response-Time', `${ms}ms`)
    })
    this.app.on('error', (err) => logger.error(`[server] ${err}`))
    this.messageRoutes()
    this.publicRoutes()
  }

  /**
   * Use nested router for message endpoints, feeding into thought process.
   * Data can be sent by POST (JSON body) or GET (as query params).
   * The Room ID is an optional param on the route, but without a room ID, the
   * bot may fail in dispatching a response, depends on the messaging platform.
   */
  messageRoutes () {
    this.messageRouter.post('/:userId/:roomId*', async (ctx) => {
      const msg = messages.server({
        userId: ctx.params.userId,
        roomId: ctx.params.roomId,
        data: ctx.body
      })
      await thoughts.serve(msg, ctx)
      if (!ctx.body) ctx.body = msg.id
    })
    this.messageRouter.get('/:userId/:roomId*', async (ctx) => {
      const msg = messages.server({
        userId: ctx.params.userId,
        roomId: ctx.params.roomId,
        data: ctx.query
      })
      await thoughts.serve(msg, ctx)
      if (!ctx.body) ctx.body = msg.id
    })
  }

  /** Public routes serve content without entering thought process/middleware */
  publicRoutes () {
    this.router.get('/public', async (ctx) => {
      ctx.body = this.publicStats()
    })
  }

  /** Start server listening on configured port and protocol */
  async start () {
    if (this.messageRouter) this.router.use('/message', this.messageRouter.routes())
    this.app.use(this.router.routes() as any)
    this.app.use(this.router.allowedMethods() as any)
    this._server = (config.get('server-secure'))
      ? https.createServer({}, this.app.callback())
      : http.createServer(this.app.callback())
    await this.listen(parseInt(config.get('server-port'), 10))
    logger.info(`[server] listening, see public stats: ${this.url}/public`)
    this._server.on('error', (err) => logger.error(`[server] ${err}`))
  }

  /** Start listening on configured port, cycling up port number if in use. */
  async listen (port: number) {
    if (!this._server) {
      logger.error(`[server] listen before server created`)
      return
    } else if (this._server.listening) {
      logger.error(`[server] already listening at ${this.url}`)
      return
    }
    await new Promise((resolve) => {
      this._server!.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logger.info(`[server] Port ${port} in use, retrying on ${port + 1}`)
          this._server!.close()
          this.listen(port + 1).catch()
        }
      })
      this._server!.listen(port, config.get('server-host'))
      this._server!.once('listening', () => {
        this.info = (this._server!.address() as AddressInfo)
        this.started = new Date()
        resolve()
      })
    })
  }

  /** Close server */
  shutdown () {
    if (this._server) this._server.close()
  }

  /** Get the root URL being served */
  get url () {
    if (!this.info) return '[server disabled]'
    const protocol = config.get('server-secure') ? 'https' : 'http'
    const { address, port } = this.info
    return `${protocol}://${address}:${port}`
  }

  /** Data for /public route to share basic operating stats */
  // @todo Move this as foundation for analytics module at later data
  publicStats () {
    return {
      name: config.get('name'),
      started: this.started,
      adapters: adapters.names,
      middlewares: Object.keys(middlewares.stacks).map((key) => {
        return `${key}: ${middlewares.stacks[key]!.stack.length}`
      })
    }
  }
}

export const server = new ServerController()

export default server
