import * as bot from '..'

/**
 * Collection of thought processes.
 * Each can be called manually to create a custom thought process, but usually
 * these methods are only initiated by `bot.receive` or `bot.dispatch`.
 * - `listen`, `understand` and `act` follow after `hear`
 * - `remember` is included after `receive` or `respond`
 */
export class Thought {

  /**
   * Start a new instance of thought processes with an optional set of listeners
   * to process. By default will process global listeners, but can accept an
   * isolated set of listeners for specific conversational context.
   */
  constructor (public listeners = bot.globalListeners) {}

  /** Process receipt of message, pass on final context to listen process. */
  async hear (message: bot.Message): Promise<bot.B> {
    bot.events.emit('hear', message)
    bot.logger.debug(`[thought] hearing message ID ${message.id}`)
    const b = await bot.middlewares.hear.execute({ message }, this.listen.bind(this))
    return b
  }

  /** Process message that was heard, try matching with basic listeners. */
  async listen (b: bot.B, done: bot.IPieceDone): Promise<void> {
    b.heard = Date.now()
    bot.events.emit('listen', b)
    bot.logger.debug(`[thought] listening to message ID ${b.message.id}`)
    for (let id in this.listeners.listen) {
      if (b.done) break
      await this.listeners.listen[id].process(b, bot.middlewares.listen)
    }
    if (b.done || b.matched) {
      if (b.matched) b.listened = Date.now()
      await done().catch((err) => bot.logger.error(`[thought] listen error: `, err))
    } else {
      await this.understand(b, done)
    }
  }

  /** Process message unmatched by basic listeners, try to match with NLU */
  async understand (b: bot.B, done: bot.IPieceDone): Promise<void> {
    bot.events.emit('understand', b)
    if (b.message instanceof bot.TextMessage && bot.adapters.language) {
      if (!bot.adapters.language.process) console.log(bot.adapters.language.name)
      bot.logger.debug(`[thought] understanding message ID ${b.message.id}`)
      const nluResultsRaw = await bot.adapters.language.process(b.message)
      if (nluResultsRaw) b.message.nlu = new bot.NLU().addResults(nluResultsRaw)
      for (let id in this.listeners.understand) {
        if (b.done) break
        await this.listeners.understand[id].process(b, bot.middlewares.understand)
      }
      if (b.done || b.matched) {
        if (b.matched) b.understood = Date.now()
        await done().catch((err) => bot.logger.error(`[thought] understand error: `, err))
        return
      }
    }
    await this.act(b, done)
  }

  /** Process message as catch all if not already handled */
  async act (b: bot.B, done: bot.IPieceDone): Promise<void> {
    bot.events.emit('act', b)
    bot.logger.debug(`[thought] acting on message ID ${b.message.id}`)
    b.message = new bot.CatchAllMessage(b.message)
    for (let id in this.listeners.act) {
      if (b.done) break
      await this.listeners.act[id].process(b, bot.middlewares.act)
    }
    if (b.matched) b.acted = Date.now()
    await done().catch((err) => bot.logger.error(`[thought] act error: `, err))
  }

  /** Process outgoing message, setting defaults for method and content */
  async respond (b: bot.B | bot.IState): Promise<bot.B> {
    bot.events.emit('respond', b)
    if (!bot.adapters.message) throw new Error('[thought] message adapter not found')
    if (!b.envelope) throw new Error(`[thought] cannot respond without envelope`)
    if (b.message) bot.logger.debug(`[thought] responding to message ID ${b.message.id}`)
    else if (b.envelope) bot.logger.debug(`[thought] respond dispatching envelope ID ${b.envelope.id}`)
    return bot.middlewares.respond.execute(b, async (b, done) => {
      await bot.adapters.message!.dispatch(b.envelope!)
      await done()
        .then(() => b.responded = Date.now())
        .catch((err) => bot.logger.error(`[thought] respond error: `, err))
    })
  }

  /** Store state via adapter after incoming or outgoing message processed. */
  async remember (b: bot.B): Promise<void> {
    bot.events.emit('remember', b)
    if (b.message) {
      bot.logger.debug(`[thought] remember state for incoming message ID ${b.message.id}`)
    } else if (b.envelope) {
      bot.logger.debug(`[thought] remember outgoing state for envelope ID ${b.envelope.id}`)
    }
    await bot.middlewares.remember.execute(b, async (b, done) => {
      await bot.keep('states', b)
      b.remembered = Date.now()
      await done().catch((err) => bot.logger.error(`[thought] remember error: `, err))
    })
  }
}

/** Interface for calling processes from bot without constructor */
export const thoughts: { [key: string]: any } = {
  hear: (message: bot.Message) => new Thought().hear(message),
  listen: (b: bot.B, done: bot.IPieceDone) => new Thought().listen(b, done),
  understand: (b: bot.B, done: bot.IPieceDone) => new Thought().understand(b, done),
  act: (b: bot.B, done: bot.IPieceDone) => new Thought().act(b, done),
  respond: (b: bot.B | bot.IState) => new Thought().respond(b),
  remember: (b: bot.B) => new Thought().remember(b)
}

/**
 * Initiate chain of thought processes for an incoming message.
 * Listener callbacks may also respond. Final state is remembered.
 */
export async function receive (message: bot.Message, callback?: bot.ICallback): Promise<bot.B> {
  const b = await thoughts.hear(message)
  if (b.heard) await thoughts.remember(b)
  if (callback) await Promise.resolve(callback())
  return b
}

/**
 * Initiate chain of thought processes for an outgoing envelope.
 * This is for sending unprompted by a listener. Final state is remembered.
 */
export async function dispatch (envelope: bot.Envelope, callback?: bot.ICallback): Promise<bot.B> {
  const b = await thoughts.respond({ envelope })
  if (b.responded) await thoughts.remember(b)
  if (callback) await Promise.resolve(callback())
  return b
}
