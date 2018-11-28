import { settings, logger, message, thought, adapter, middleware } from '.'
import Koa from 'koa'
import koaBody from 'koa-body'
import Router from 'koa-router'
import http from 'http'
import https from 'https'
import { AddressInfo } from 'net'

/** Listen for data over HTTP/s */
export namespace server {
  /** Server states include Koa context, to respond to http/s requests. */
  export interface IContext extends Router.IRouterContext {}

  /** Koa app. */
  export let app: Koa

  /** Http/s server. */
  export let server: http.Server | https.Server

  /** Koa router. */
  export let router: Router

  /** Served address. */
  export let info: AddressInfo

  /** Koa sub-router for request messages. */
  export let messageRouter: Router

  /** Timestamp for server startup. */
  export let started: Date

  /** Initialise server and router, adding logger middleware */
  export function load () {
    if (!settings.get('use-server')) return
    app = new Koa()
    router = new Router()
    messageRouter = new Router()
    app.use(koaBody())
    app.use(async (ctx, next) => {
      const start = new Date().getTime()
      await next()
      const ms = new Date().getTime() - start
      logger.info(`[server] served ${ctx.method} ${ctx.url} - ${ms}ms`)
      ctx.set('X-Response-Time', `${ms}ms`)
    })
    app.on('error', (err) => logger.error(`[server] ${err}`))
    messageRoutes()
    publicRoutes()
  }

  /**
   * Use nested router for message endpoints, feeding into thought process.
   * Data can be sent by POST (JSON body) or GET (as query params).
   * The Room ID is an optional param on the route, but without a room ID, the
   * bot may fail in dispatching a response, depends on the messaging platform.
   */
  export function messageRoutes () {
    if (!messageRouter) return
    messageRouter.post('/:userId/:roomId*', async (ctx) => {
      const msg = message.server({
        userId: ctx.params.userId,
        roomId: ctx.params.roomId,
        data: ctx.body
      })
      await thought.serve(msg, ctx)
      if (!ctx.body) ctx.body = msg.id
    })
    messageRouter.get('/:userId/:roomId*', async (ctx) => {
      const msg = message.server({
        userId: ctx.params.userId,
        roomId: ctx.params.roomId,
        data: ctx.query
      })
      await thought.serve(msg, ctx)
      if (!ctx.body) ctx.body = msg.id
    })
  }

  /** Public routes serve content without entering thought process/middleware */
  export function publicRoutes () {
    if (!router) return
    router.get('/public', async (ctx) => {
      ctx.body = publicStats()
    })
  }

  /** Start server listening on configured port and protocol */
  export async function start () {
    if (!app || !router) return
    if (messageRouter) router.use('/message', messageRouter.routes())
    app.use(router.routes())
    app.use(router.allowedMethods())
    server = (settings.get('server-secure'))
      ? https.createServer({}, app.callback())
      : http.createServer(app.callback())
    await listen(parseInt(settings.get('server-port'), 10))
    logger.info(`[server] listening, see public stats: ${url()}/public`)
    server.on('error', (err) => logger.error(`[server] ${err}`))
  }

  /** Start listening on configured port, cycling up port number if in use. */
  export async function listen (port: number) {
    if (!server) {
      logger.error(`[server] listen before server created`)
      return
    } else if (server.listening) {
      logger.error(`[server] already listening at ${url()}`)
      return
    }
    await new Promise((resolve) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logger.info(`[server] Port ${port} in use, retrying on ${port + 1}`)
          server.close()
          listen(port + 1).catch()
        }
      })
      server.listen(port, settings.get('server-host'))
      server.once('listening', () => {
        info = (server.address() as AddressInfo)
        started = new Date()
        resolve()
      })
    })
  }

  /** Close server */
  export async function shutdown () {
    if (server) server.close()
  }

  /** Get the root URL being served */
  export function url () {
    if (!info) return '[server disabled]'
    const protocol = settings.get('server-secure') ? 'https' : 'http'
    const { address, port } = info
    return `${protocol}://${address}:${port}`
  }

  /** Data for /public route to share basic operating stats */
  // @todo Move this as foundation for analytics module at later data
  export function publicStats () {
    return {
      name: settings.get('name'),
      started: started,
      adapters: Object.keys(adapter.adapters).map((key) => {
        return adapter.adapters[key]!.name
      }),
      middleware: Object.keys(middleware.stacks).map((key) => {
        return `${key}: ${middleware.stacks[key]!.stack.length}`
      })
    }
  }
}
