import {
  Message,
  ICallback,
  middlewares,
  B,
  listeners,
  logger,
  IPieceDone,
  CatchAllMessage,
  nluListeners,
  events
} from '..'

/**
 * Process receipt of message, pass on final context to listen process.
 * @param message Message to `hear` (sub-class instance, e.g. TextMessage)
 * @param callback Callback to fire after all following processes complete
 */
export function hear (message: Message, callback?: ICallback): Promise<B> {
  events.emit('hear', message)
  logger.debug(`Hear process started for message ID ${message.id}`)
  return middlewares.hear.execute({ message }, listen, callback)
}

/**
 * Process message that was heard, calls middleware for each listener.
 * Continue thought process once all listeners processed if none matched or
 * manually finished the state. Exits hear if catch-all, regardless of match.
 */
export async function listen (b: B, done: IPieceDone): Promise<void> {
  events.emit('listen', b)
  logger.debug(`Listen process started for message ID ${b.message.id}`)
  for (let id in listeners) {
    if (b.done) break
    await listeners[id].process(b, middlewares.listen)
  }
  if (b.done || b.matched || b.message instanceof CatchAllMessage) {
    done().catch((err) => logger.error(`Listen process error: `, err))
  } else {
    await understand(b, done)
  }
}

/**
 * @todo test with bundled NLP adapter
 * @todo bypass NLU when b.message instanceof CatchAllMessage
 */
export async function understand (b: B, done: IPieceDone): Promise<void> {
  // nlu adapter await goes here - adds result to `b.message.nlu`
  events.emit('understand', b)
  logger.debug(`Understand process started for message ID ${b.message.id}`)
  for (let id in nluListeners) {
    if (b.done) break
    await nluListeners[id].process(b, middlewares.understand)
  }
  if (b.done || b.matched) {
    done().catch((err) => logger.error(`Understand process error: `, err))
  } else {
    await act(b, done)
  }
}

/** Fire catch all if message is not already handled (recursive `hear`) */
export async function act (b: B, done: IPieceDone): Promise<void> {
  events.emit('act', b)
  logger.debug(`Act process started for message ID ${b.message.id}`)
  await hear(new CatchAllMessage(b.message), () => done())
}

/** Pass outgoing messages through middleware, fired from listener callbacks */
export async function respond (b: B, callback?: ICallback): Promise<B> {
  // bot send await goes here
  events.emit('respond', b)
  logger.debug(`Respond process started for message ID ${b.message.id}`)
  return middlewares.respond.execute(b, remember, callback)
}

/** Record incoming and outgoing messages, via middleware */
export async function remember (b: B, done: IPieceDone): Promise<void> {
  // storage adapter await goes here
  events.emit('remember', b)
  logger.debug(`Remember process started for message ID ${b.message.id}`)
  done().catch((err) => logger.error(`Remember process error: `, err))
}
