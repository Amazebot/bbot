/** @module middlewareInterfaces */

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
