/**
 * @module middleware
 * Provide interfaces to create and populate an asynchronous middleware pipeline
 * for any internal process.
 */

import { logger } from './logger'

/** Collection of middleware types and their stacks. */
export const middlewares: { [key: string]: Middleware } = {}

/**
 * State object, can be modified by a series of middleware pieces
 * Has some known properties but can contain others needed for type of process.
 */
export interface IContext {
  [key: string]: any | {
    response?: {}
  }
}

/**
 * A generic middleware pipeline function that can either continue the pipeline
 * or interrupt it. Can return a promise to wait on before next piece executed.
 *
 * The `next` function should be called to continue on to the next piece in the
 * stack. It can be called with a single, optional argument: either the provided
 * `done` function or a new function that eventually calls done, to execute
 * logic after the stack completes. If the argument is not given, the provided
 * done will be assumed.
 */
export interface IPiece {
  (context: IContext, next: (done?: IPieceDone) => Promise<void>, done: IPieceDone): Promise<any> | void
}

/**
 * A `done` function, created when executing middleware piece, is passed to each
 * piece and can be called (with no arguments) to interrupt the stack and begin
 * executing the chain of completion functions.
 */
export interface IPieceDone {
  (newDone?: IPieceDone): Promise<void>
}

/**
 * Middleware complete function, handles successful processing and final state
 * of context after middleware stack completes, before the callback.
 */
export interface IComplete {
  (context: IContext, done: IPieceDone): any
}

/**
 * A callback to fire when middleware finished executing, regardless of success.
 * Can return a promise for middleware executor to wait before continuing to
 * other operations. May be given an error if a middleware piece throws.
 */
export interface ICallback {
  (err?: Error): Promise<void> | void
}

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
export class Middleware {
  /** Contains middleware "pieces" (callbacks) to execute */
  public stack: IPiece[] = []

  /** Remember own name for tracing middleware */
  constructor (public type: string = 'default') {}

  /** Add a piece to the pipeline */
  register (piece: IPiece): void {
    this.stack.push(piece)
  }

  /** Execute all middleware in order, following by chained completion handlers. */
  execute (context: IContext, complete: IComplete, callback: ICallback): Promise<IContext> {
    logger.debug(`[middleware] executing ${this.type} middleware`, { size: this.stack.length })
    return new Promise((resolve, reject) => {
      /** The initial completion handler that may be wrapped by iterations. */
      const initDone: IPieceDone = () => {
        return Promise.resolve(callback()).then(() => resolve(context))
      }

      /**
       * Execute a single piece of middleware. If an error occurs, complete the
       * middleware without executing deeper.
       */
      const executePiece = async (done: IPieceDone, piece: IPiece, cb: Function) => {
        const next: IPieceDone = (newDone?: IPieceDone) => cb(newDone || done)
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
      const finished = (err: Error | null, done: IPieceDone): void => {
        logger.debug(`[middleware] finished ${this.type} middleware ${err ? 'with error' : 'without error'}`)
        if (err) reject(err)
        else Promise.resolve(complete(context, done)).then(() => resolve(context)).catch()
      }

      /**
       * Async reduction loop, passes the `done` from one piece to the next.
       * Calls `finished` at the end, or if an error occurs.
       */
      const reduceStack = async (): Promise<void> => {
        let done: IPieceDone = initDone
        try {
          for (let piece of this.stack) {
            await executePiece(done, piece, (newDone: IPieceDone) => {
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

/**
 * Thought process middleware collection.
 * Contains pieces for async execution at each stage of input processing loop.
 */
export function loadMiddleware () {
  middlewares.listen = new Middleware('listen')
  middlewares.understand = new Middleware('understand')
  middlewares.receive = new Middleware('receive')
  middlewares.remember = new Middleware('remember')
  middlewares.respond = new Middleware('respond')
}

/**
 * Remove all middleware for reset
 */
export function unloadMiddleware () {
  delete middlewares.listen
  delete middlewares.understand
  delete middlewares.receive
  delete middlewares.remember
  delete middlewares.respond
}
