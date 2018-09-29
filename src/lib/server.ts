import * as bot from '..'
import Koa from 'koa'
import koaBody from 'koa-body'
import Router from 'koa-router'
import http from 'http'
import https from 'https'
import { AddressInfo } from 'net'

/** Server states include Koa context object, to respond to http/s requests. */
export interface IServerContext extends Koa.Context {}

export class Server {
  enabled: boolean
  secure: boolean
  app?: Koa
  server?: http.Server | https.Server
  info?: AddressInfo
  router?: Router
  messageRouter?: Router
  started?: Date

  constructor () {
    this.enabled = bot.settings.get('use-server')
    this.secure = bot.settings.get('server-secure')
  }

  /** Initialise server and router, adding logger middleware */
  load () {
    if (!this.enabled) return
    this.app = new Koa()
    this.router = new Router()
    this.messageRouter = new Router()
    this.app.use(koaBody())
    this.app.use(async (ctx, next) => {
      const start = new Date().getTime()
      await next()
      const ms = new Date().getTime() - start
      bot.logger.info(`[server] served ${ctx.method} ${ctx.url} - ${ms}ms`)
      ctx.set('X-Response-Time', `${ms}ms`)
    })
    this.app.on('error', (err) => bot.logger.error(`[server] ${err}`))
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
    if (!this.messageRouter) return
    this.messageRouter.post('/:userId/:roomId*', async (ctx) => {
      const message = new bot.ServerMessage({
        userId: ctx.params.userId,
        roomId: ctx.params.roomId,
        data: ctx.request.body
      })
      await bot.serve(message, ctx)
      if (!ctx.body) ctx.body = message.id
    })
    this.messageRouter.get('/:userId/:roomId*', async (ctx) => {
      const message = new bot.ServerMessage({
        userId: ctx.params.userId,
        roomId: ctx.params.roomId,
        data: ctx.query
      })
      await bot.serve(message, ctx)
      if (!ctx.body) ctx.body = message.id
    })
  }

  /** Public routes serve content without entering thought process/middleware */
  publicRoutes () {
    if (!this.router) return
    this.router.get('/public', async (ctx) => {
      ctx.body = this.publicStats()
    })
  }

  /** Start server listening on configured port and protocol */
  async start () {
    if (!this.app || !this.router) return
    if (this.messageRouter) this.router.use('/message', this.messageRouter.routes())
    this.app.use(this.router.routes())
    this.app.use(this.router.allowedMethods())
    this.server = (this.secure)
      ? https.createServer({}, this.app.callback())
      : http.createServer(this.app.callback())
    await this.listen(parseInt(bot.settings.get('server-port'), 10))
    bot.logger.info(`[server] listening, see public stats: ${this.url()}/public`)
    this.server.on('error', (err) => bot.logger.error(`[server] ${err}`))
  }

  /** Start listening on configured port, cycling up port number if in use. */
  async listen (port: number) {
    if (!this.server) {
      bot.logger.error(`[server] listen before server created`)
      return
    } else if (this.server.listening) {
      bot.logger.error(`[server] already listening at ${this.url()}`)
      return
    }
    await new Promise((resolve) => {
      this.server!.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          bot.logger.info(`[server] Port ${port} in use, retrying on ${port + 1}`)
          this.server!.close()
          this.listen(port + 1).catch()
        }
      })
      this.server!.listen(port, bot.settings.get('server-host'))
      this.server!.once('listening', () => {
        this.info = (this.server!.address() as AddressInfo)
        this.started = new Date()
        resolve()
      })
    })
  }

  /** Close server */
  async shutdown () {
    if (this.server) this.server.close()
  }

  /** Get the root URL being served */
  url () {
    if (!this.info) return '[server disabled]'
    const protocol = this.secure ? 'https' : 'http'
    const { address, port } = this.info
    return `${protocol}://${address}:${port}`
  }

  /** Data for /public route to share basic operating stats */
  // @todo Move this as foundation for analytics module at later data
  publicStats () {
    return {
      name: bot.settings.name,
      started: this.started,
      adapters: Object.keys(bot.adapters).map((key) => {
        return bot.adapters[key].name
      }),
      middleware: Object.keys(bot.middlewares).map((key) => {
        return `${key}: ${bot.middlewares[key].stack.length}`
      })
    }
  }
}

export const server = new Server()
