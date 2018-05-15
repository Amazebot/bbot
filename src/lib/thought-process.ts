import {
  Message,
  ICallback,
  middlewares,
  B,
  listeners,
  logger,
  IPieceDone
} from '..'

/**
 * Process receipt of message, pass on final context to listen process.
 * @param message Message to `hear` (sub-class instance, e.g. TextMessage)
 * @param callback Callback to fire after all following processes complete
 */
export function hear (message: Message, callback?: ICallback): Promise<B> {
  return middlewares.hear.execute({ message }, listen, callback)
}

/**
 * Process message that was heard, calls middleware for each listener.
 * Continue thought process once all listeners processed if none matched or
 * manually finished the state.
 * @param b State to provide to listeners, from `hear` process
 * @todo test that final state is affected by changes in listeners
 */
export async function listen (b: B, done: IPieceDone): Promise<void> {
  for (let id in listeners) {
    await listeners[id].process(b, middlewares.listen)
    if (b.done) break // stop processing listeners if state finished
  }
  if (!b.done && !b.matched) await understand(b)
  done().catch((err) => logger.error(`Listeners middleware done error:`, err))
}

export async function understand (b: B): Promise<B> {
  return b
}

/** @todo Investigate demo catchAll message and see if it still makes sense */
/** Fire catch all if message is not already handled */
export async function act (b: B): Promise<B> {
  return b
}

export async function respond (b: B): Promise<B> {
  return b
}

export async function remember (b: B): Promise<B> {
  return b
}
