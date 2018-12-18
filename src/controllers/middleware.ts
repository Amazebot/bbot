import { Middleware, IPiece } from '../components/middleware'

/** Asynchronous dynamic processing pipelines. */
export class MiddlewareController {
  /** Collection of allowed middleware types for loading. */
  types = [
    'hear', 'listen', 'understand', 'serve', 'act', 'respond', 'remember'
  ]

  /** Initial collection of middleware stacks for loading (extendible). */
  stacks: { [name: string]: Middleware | undefined } = {}

  /** Get a middleware stack by name (creating if not exists). */
  get (stack: string) {
    if (!this.stacks[stack]) this.stacks[stack] = new Middleware(stack)
    return this.stacks[stack]!
  }

  /** Populate all middleware stacks. */
  loadAll () {
    for (let stack of this.types) this.get(stack)
  }

  /** Remove all middleware for reset. */
  unloadAll () {
    for (let stack in this.stacks) delete this.stacks[stack]
  }

  /** Registration new piece in a middleware stack (creating if not exists). */
  register (stack: string, middlewarePiece: IPiece) {
    return this.get(stack).register(middlewarePiece)
  }
}

export const middleware = new MiddlewareController()

export default middleware
