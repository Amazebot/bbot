import * as bot from '..'

/**
 * Process receipt of message, pass on final context to listen process.
 * @param message Message to `hear` (sub-class instance, e.g. TextMessage)
 * @param callback Callback to fire after all following processes complete
 */
export function hear (message: bot.Message, callback?: bot.ICallback): Promise<bot.B> {
  bot.events.emit('hear', message)
  bot.logger.debug(`Hear process started for message ID ${message.id}`)
  return bot.middlewares.hear.execute({ message }, listen, callback)
}

/**
 * Process message that was heard, calls middleware for each listener.
 * Continue thought process once all listeners processed if none matched or
 * manually finished the state. Exits hear if catch-all, regardless of match.
 */
export async function listen (b: bot.B, done: bot.IPieceDone): Promise<void> {
  bot.events.emit('listen', b)
  bot.logger.debug(`Listen process started for message ID ${b.message.id}`)
  for (let id in bot.listeners) {
    if (b.done) break
    await bot.listeners[id].process(b, bot.middlewares.listen)
  }
  if (b.done || b.matched || b.message instanceof bot.CatchAllMessage) {
    done().catch((err) => bot.logger.error(`Listen process error: `, err))
  } else {
    await understand(b, done)
  }
}

/**
 * @todo test with bundled NLP adapter
 * @todo bypass NLU when b.message instanceof bot.CatchAllMessage
 */
export async function understand (b: bot.B, done: bot.IPieceDone): Promise<void> {
  // nlu adapter await goes here - adds result to `b.message.nlu`
  bot.events.emit('understand', b)
  bot.logger.debug(`Understand process started for message ID ${b.message.id}`)
  for (let id in bot.nluListeners) {
    if (b.done) break
    await bot.nluListeners[id].process(b, bot.middlewares.understand)
  }
  if (b.done || b.matched) {
    done().catch((err) => bot.logger.error(`Understand process error: `, err))
  } else {
    await act(b, done)
  }
}

/** Fire catch all if message is not already handled (recursive `hear`) */
export async function act (b: bot.B, done: bot.IPieceDone): Promise<void> {
  bot.events.emit('act', b)
  bot.logger.debug(`Act process started for message ID ${b.message.id}`)
  await hear(new bot.CatchAllMessage(b.message), () => done())
}

/**
 * Pass outgoing messages through middleware, fired from listener callbacks.
 * This can be initiated from a listener callback, in which case the state will
 * exist (instance of bot.B). If however, it was initiated by some other request or
 * event, state can be initialised from arguments provided.
 */
export async function respond (
  b: bot.B | bot.IState,
  callback?: bot.ICallback
): Promise<bot.B> {
  bot.events.emit('respond', b)
  bot.logger.debug(`Respond process started for message ID ${b.message.id}`)
  if (!bot.adapters.message) {
    return Promise.reject(`Respond cannot ${b.method} without message adapter.`)
  }
  return bot.middlewares.respond.execute(b, async (b, done) => {
    if (!b.method) b.method = 'send' // default response sends back to room
    await bot.adapters.message[b.method].call(bot.adapters.message, b.envelope)
    done().catch((err) => bot.logger.error(`Respond process error: `, err))
  }, callback)
}

/**
 * Record incoming and outgoing messages, via middleware.
 * Stores whatever values remain in state after middleware pieces execute.
 * Strips the main bot class and any function attributes from state beforehand.
 */
export async function remember (
  b: bot.B,
  callback?: bot.ICallback
): Promise<any> {
  bot.events.emit('remember', b)
  bot.logger.debug(`Remember process started for message ID ${b.message.id}`)
  const stateExcludes = ['bot'] /** @todo Add more to minimize storage size */
  const state = Object.keys(b)
    .filter((key) => !stateExcludes.includes(key))
    .reduce((obj: any, key) => {
      if (typeof obj[key] !== 'function') obj[key] = b[key]
      return obj
    }, {})
  return bot.middlewares.remember.execute(state, async (state, done) => {
    await bot.adapters.storage.store('states', state)
    done().catch((err) => bot.logger.error(`Remember process error: `, err))
  }, callback)
}
