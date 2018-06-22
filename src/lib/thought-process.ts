import * as bot from '..'

/** Process receipt of message, pass on final context to listen process. */
export function hear (message: bot.Message, callback?: bot.ICallback): Promise<bot.B> {
  bot.events.emit('hear', message)
  bot.logger.debug(`[thought-process] hear started for message ID ${message.id}`)
  return bot.middlewares.hear.execute({ message }, listen, callback)
}

/** @todo update method headers to be consistent and contain inline comments */

/**
 * Process message that was heard, calls middleware for each listener.
 * Continue thought process once all listeners processed if none matched or
 * manually finished the state.
 * @todo Assess if listeners should require `done` to be set to prevent further
 *       processing, or if that should be the default.
 */
export async function listen (b: bot.B, final: bot.IPieceDone): Promise<void> {
  b.heard = Date.now()
  bot.events.emit('listen', b)
  bot.logger.debug(`[thought-process] listen started for message ID ${b.message.id}`)
  for (let id in bot.listeners) {
    if (b.done) break
    await bot.listeners[id].process(b, bot.middlewares.listen)
  }
  const done = () => remember(b).then(() => final()) // add remember at the end
  if (b.done || b.matched) {
    if (b.matched) b.listened = Date.now()
    await done().catch((err) => bot.logger.error(`Listen process error: `, err))
  } else {
    await understand(b, done)
  }
}

/**
 * @todo call NLU adapter to understand, add result to `b.message.nlu`
 * @todo test with bundled NLP adapter
 * @todo bypass NLU when b.message instanceof bot.CatchAllMessage
 */
export async function understand (b: bot.B, done: bot.IPieceDone): Promise<void> {
  bot.events.emit('understand', b)
  bot.logger.debug(`[thought-process] understand started for message ID ${b.message.id}`)
  for (let id in bot.nluListeners) {
    if (b.done) break
    await bot.nluListeners[id].process(b, bot.middlewares.understand)
  }
  if (b.done || b.matched) {
    if (b.matched) b.understood = Date.now()
    await done().catch((err) => bot.logger.error(`[thought-process] understand error: `, err))
  } else {
    await act(b, done)
  }
}

/**
 * Fire catch all if message is not already handled
 * Wraps message in state as a CatchAllMessage type, processes catch all listeners
 */
export async function act (b: bot.B, done: bot.IPieceDone): Promise<void> {
  bot.events.emit('act', b)
  bot.logger.debug(`[thought-process] act started for message ID ${b.message.id}`)
  b.message = new bot.CatchAllMessage(b.message)
  for (let id in bot.catchAllListeners) {
    if (b.done) break
    await bot.catchAllListeners[id].process(b, bot.middlewares.act)
  }
  if (b.matched) b.acted = Date.now()
  await done().catch((err) => bot.logger.error(`Listen process error: `, err))
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
  bot.logger.debug(`[thought-process] respond started for message ID ${b.message.id}`)
  if (!bot.adapters.message) {
    return Promise.reject(`Respond cannot ${b.method} without message adapter.`)
  }
  return bot.middlewares.respond.execute(b, async (b, final) => {
    if (!b.method) b.method = 'send' // default response sends back to same room
    if (!b.envelope) b.write('') // empty string response if invoked without any
    await bot.adapters.message.respond(b.envelope, b.method)
    const done = () => remember(b).then(() => final()) // add remember at the end
    b.responded = Date.now() // record time of response
    await done().catch((err) => bot.logger.error(`[thought-process] respond error: `, err))
  }, callback)
}

/**
 * Record incoming and outgoing messages, via middleware.
 * Stores whatever values remain in state after middleware pieces execute.
 * Checks for prior remembering, as used for completion on listen and respond.
 * Strips the main bot class and any function attributes from state beforehand.
 * @todo Re above, respond could be called without a listen, that's why it might
 *       fire twice. There could be a more graceful way of handling the thought
 *       process completion, like possible using a single interface for thoughts
 *       e.g. thought('hear', args), then it can add the final piece only once,
 *       when used either as thought('hear') or thought('respond'). Could still
 *       retain bot.hear and bot.respond as proxies for above. Should that also
 *       revert usage of bot.listen in place of bot.listenText. Maybe all
 *       thought stages should only be called internally and bot accessors are
 *       bot.receive and bot.send - for hubot compatibility and since when
 *       bot.respond is called directly, its actually unprompted, therefore not
 *       a response.
 *       Consider renaming `thought-process.ts` as just `thought.ts` too.
 *       Move adapter storage check into brain, remember should just call keep.
 *       Consider use of thought for custom contained sets of listeners (e.g.
 *       within a scene), might make sense to accept the listeners as arg, but
 *       use the 'global' listeners as default. Scenes shouldn't reproduce
 *       thought process the way they do in current Playbook.
 */
export async function remember (
  b: bot.B,
  callback?: bot.ICallback
): Promise<any> {
  if (b.remembered) return undefined // already remembered (by respond done)
  bot.events.emit('remember', b)
  if (!bot.adapters.storage) {
    bot.logger.warn(`[thought-process] cannot remember without storage adapter.`)
    if (callback) await callback()
    b.remembered = Date.now()
  } else {
    bot.logger.debug(`[thought-process] remember started for message ID ${b.message.id}`)
    return bot.middlewares.remember.execute(b, async (b, done) => {
      await bot.keep('states', b)
      b.remembered = Date.now()
      await done().catch((err) => bot.logger.error(`[thought-process] remember error: `, err))
    }, callback)
  }
}
