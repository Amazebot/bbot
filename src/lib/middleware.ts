import { logger } from './logger'
import { IContext, IMiddlewarePiece, IMiddlewareCallback, IMiddlewareComplete, IMiddlewarePieceDone } from '../config/middlewareInterfaces'

/**
 * Generic async middleware, handles a stack (or pipeline) of functions that
 * to pass along and possibly modify context for a final piece of functionality.
 *
 * Similar to Express middleware, every middleware `piece` receives the same API
 * signature of `context`, `next`, and `done`. Each piece can either continue
 * the chain (by calling next) or interrupt the chain (by calling done).
 * If all middleware continues, a `complete` function is called to handle the
 * final context state.
 *
 * Middleware may wrap the done callback to allow executing code in the second
 * half of the process (after `complete` has been executed or a deeper piece
 * of middleware has interrupted).
 *
 * Different kinds of middleware may receive different information in the
 * context object. For more details, see the API for each type of middleware.
 */
export default class Middleware {
  /** Contains middleware "pieces" (callbacks) to execute */
  public stack: IMiddlewarePiece[] = []

  /** Remember own name for tracing middleware */
  constructor (public type: string = 'default') {}

  /** Add a piece to the pipeline */
  register (piece: IMiddlewarePiece): void {
    this.stack.push(piece)
  }

  /** Execute all middleware in order, following by chained completion handlers. */
  execute (context: IContext, complete: IMiddlewareComplete, callback: IMiddlewareCallback): Promise<IContext> {
    logger.debug(`[middleware] executing ${this.type} middleware`, { size: this.stack.length })
    return new Promise((resolve, reject) => {
      /** The initial completion handler that may be wrapped by iterations. */
      const initDone: IMiddlewarePieceDone = () => {
        return Promise.resolve(callback()).then(() => resolve(context))
      }

      /**
       * Execute a single piece of middleware. If an error occurs, complete the
       * middleware without executing deeper.
       */
      const executePiece = async (done: IMiddlewarePieceDone, piece: IMiddlewarePiece, cb: Function) => {
        const next: IMiddlewarePieceDone = (newDone?: IMiddlewarePieceDone) => cb(newDone || done)
        try {
          await Promise.resolve(piece(context, next, done))
        } catch (err) {
          err.context = context
          err.middleware = this.type
          logger.error(err)
          done().catch()
          throw err
        }
      }

      /**
       * Called when async reduce completes all iterations, to run `complete`
       * piece then the success callback.
       */
      const finished = (err: Error | null, done: IMiddlewarePieceDone): void => {
        logger.debug(`[middleware] finished ${this.type} middleware ${err ? 'with error' : 'without error'}`)
        if (err) reject(err)
        else Promise.resolve(complete(context, done)).then(() => resolve(context)).catch()
      }

      /**
       * Async reduction loop, passes the `done` from one piece to the next.
       * Calls `finished` at the end, or if an error occurs.
       */
      const reduceStack = async (): Promise<void> => {
        let done: IMiddlewarePieceDone = initDone
        try {
          for (let piece of this.stack) {
            await executePiece(done, piece, (newDone: IMiddlewarePieceDone) => {
              done = newDone
            })
          }
          finished(null, done)
        } catch (err) {
          finished(err, done)
        }
      }

      // Start running the stack at the end of current Node event loop
      process.nextTick(() => reduceStack())
    })
  }
}
