export interface IContext {
}

/**
 * A generic middleware pipeline function that can either continue the pipeline
 * or interrupt it.
 *
 * If execution should continue, the middleware should call the `next` function
 * with `done` as an optional argument (to allow override).
 *
 * If not, the middleware should call the `done` function with no arguments.
 *
 * Middleware may wrap the `done` function in order to execute logic after the
 * final callback has been executed.
 */
export interface IMiddlewarePiece {
  (context: IContext, next: Function, done?: Function): Promise<any>
}

/**
 * A callback to fire on successful execution of a middleware stack
 * Should accept no arguments and can return a promise for middleware caller
 * to wait before continuing to other operations.
 */
export interface IMiddlewareCallback {
  (): Promise<void> | undefined
}
