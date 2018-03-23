import * as bot from './bot'
import { reduce } from 'async'
import { IContext, IMiddlewarePiece, IMiddlewareCallback } from '../config/middlewareInterfaces'

export default class Middleware {
  /** Contains middleware "pieces" (callbacks) to execute */
  stack: IMiddlewarePiece[] = []

  /**
   * Execute all middleware in order.
   * `last` piece goes last with the latest `done` callback.
   * If all middleware is compliant, `cb` should be called with no arguments
   * when the entire stack is complete.
   *
   * @param context  The initial state object, can be modified by each piece
   * @param last     An initial piece, will executed after any added pieces
   * @param cb       Fires when/if all middleware completes, can be wrapped
   */
  execute (context: IContext, last: IMiddlewarePiece, callback: IMiddlewareCallback): Promise<IContext> {
    return new Promise((resolve, reject) => {
      /**
       * Allow each piece to resolve the promise early if it calls done().
       * The initial state of the reduction that may be wrapped by iterations.
       */
      const initDone = () => {
        return Promise.resolve(callback()).then(() => resolve(context))
      }

      /**
       * Execute a single piece of middleware, which can wrap the 'done'
       * callback with additional logic.
       *
       * The piece is executed as an array reduce iterator.
       * @param done  Done function (memo state of the reduction)
       * @param piece Current piece of middleware from stack (item in reduce)
       * @param cb    Call to move to next piece in stack, with error to cancel
       *
       * If an error occurs when calling the piece, fail the middleware and stop
       * executing deeper.
       */
      const executePiece = async (done: Function, piece: IMiddlewarePiece, cb: Function) => {
        const next = (newDone?: Function) => cb(null, newDone || done)
        try {
          await Promise.resolve(piece(context, next, done))
        } catch (err) {
          err.context = context
          bot.events.emit('error', err)
          done() // stop executing deeper
          cb(err) // exit reduce iterations
          reject(err) // fail middleware
        }
      }

      /**
       * Called when array.reduce completes all iterations, to run the last
       * piece in the stack, then the success callback.
       */
      const reduced = (err: Error | undefined, memo: any) => {
        if (err) return Promise.reject(err)
        return Promise.resolve(last(context, memo).then(() => resolve(context)))
      }

      /**
       * Async reduction handled by async module
       */
      return reduce(this.stack, initDone, executePiece, reduced)
    })
  }

  /** Add a piece to the pipeline */
  register (piece: IMiddlewarePiece): void {
    this.stack.push(piece)
  }
}