import * as bot from '..'

/** Options for defining thought process. */
export interface IThought {
  name: string
  b: bot.State
  validate?: () => Promise<boolean> | boolean
  action?: (success: boolean) => Promise<void> | void
  listeners?: { [id: string]: bot.Listener }
  middleware?: bot.Middleware
}

/**
 * Defines a process to wrap execution of middleware of the same name.
 * Validators can prevent a process from running.
 * Actions can effect the state before the next process validates.
 */
export class Thought implements IThought {
  name: string
  b: bot.State
  validate: () => Promise<boolean> | boolean = () => Promise.resolve(true)
  action: (success: boolean) => Promise<void> | void = (_) => Promise.resolve()
  middleware: bot.Middleware
  listeners?: { [id: string]: bot.Listener }

  /**
   * Create new thought process with optional validate and action functions.
   * Presence of listeners in options determines how middleware will execute.
   * Without middleware option, will use "global" middleware of same name.
   */
  constructor (options: IThought) {
    this.name = options.name
    this.b = options.b
    if (options.validate) this.validate = options.validate
    if (options.action) this.action = options.action
    if (options.listeners) this.listeners = options.listeners
    if (options.middleware) this.middleware = options.middleware
    else if (bot.middlewares[this.name]) this.middleware = bot.middlewares[this.name]
    else throw new Error('[thought] invalid middleware provided')
  }

  /**
   * Call validate, execute middleware, possibly listeners, then action.
   * Will not enter process with empty listeners or if state `done` is true.
   * Without listeners, execute middleware, resolve on completion.
   * With listeners, process each listener or until state `done` is true.
   * Action will be called with the boolean success of the process.
   * Process succeeds if middleware completed or listeners were matched.
   * If process succeeds, timestamp is added to state.
   */
  async process () {
    // let isPending = true
    return new Promise((resolve, reject) => {
      const { b, name, validate, middleware, listeners } = this
      if (listeners && Object.keys(listeners).length === 0) {
        bot.logger.debug(`[thought] skip ${name}, no listeners to process`)
        return reject()
      }
      if (listeners && b.done) {
        bot.logger.debug(`[thought] skip ${name}, listener processing is done`)
        return reject()
      }
      Promise.resolve(validate())
        .then(async (valid) => {
          if (!valid) {
            bot.logger.debug(`[thought] ${name} validator bypassed process`)
            return reject()
          }
          if (b.message) bot.logger.debug(`[thought] ${name} processing incoming message ID ${b.message.id}`)
          else if (b.envelopes) bot.logger.debug(`[thought] ${name} processing outgoing envelopes`)
          if (typeof listeners === 'undefined') return middleware.execute(b, resolve).then(reject)
          for (let id in listeners) {
            if (b.done) break
            await listeners[id].process(b, middleware)
          }
          return (b.matched) ? resolve() : reject()
        })
        .catch((err) => {
          bot.logger.debug(`[thought] ${name} validation error ${err.message}`)
          reject()
        })
    })
      .then(() => {
        // listener will add timestamp on match, so that it pre-dates response
        if (!this.b.processed[this.name]) this.b.processed[this.name] = Date.now()
        return this.action(true)
      })
      .catch((err) => {
        if (err) bot.logger.error(`[thought] ${this.name} error, ${err.message}`)
        return this.action(false)
      })
  }
}

/**
 * Collection of processes and listeners to execute with middleware and state.
 * Will use global listeners by default, but can be replaced with custom set.
 * Sequence arrays define orders of named processes, to run consecutively.
 * Default sequences are `receive` and `dispatch` to process incoming/outgoing.
 * Each process may have a `validate` method to run before processing and an
 * `action` method to run after. Validate returning false will skip the process.
 */
export class Thoughts {
  b: bot.State | bot.State
  listeners: bot.Listeners = bot.globalListeners
  sequence: { [key: string]: string[] } = {
    receive: ['hear', 'listen', 'understand', 'act', 'remember'],
    respond: ['respond'],
    dispatch: ['respond', 'remember']
  }
  processes: { [key: string]: bot.Thought }

  /**
   * Start a new instance of thought processes with an optional set of listeners
   * to process. By default will process global listeners, but can accept an
   * isolated set of listeners for specific conversational context.
   */
  constructor (
    state: bot.State,
    newListeners?: bot.Listeners
  ) {
    this.b = state
    if (newListeners) this.listeners = newListeners
    const { b, listeners } = this

    // Define processes with specific validation and post processing actions
    this.processes = {
      hear: new bot.Thought({ name: 'hear', b }),
      listen: new bot.Thought({ name: 'listen', b, listeners: listeners.listen }),
      understand: new bot.Thought({ name: 'understand', b, listeners: listeners.understand }),
      act: new bot.Thought({ name: 'act', b, listeners: listeners.act }),
      respond: new bot.Thought({ name: 'respond', b }),
      remember: new bot.Thought({ name: 'remember', b })
    }

    // Ignore all further listeners if hear process interrupted
    this.processes.hear.action = async (success: boolean) => {
      if (!success) b.finish()
    }

    // Only processed forced understand listeners if basic listener matched
    this.processes.listen.action = async (success: boolean) => {
      if (success) this.listeners.forced('understand')
    }

    // Get NLU result before understand listeners and only if required
    this.processes.understand.validate = async () => {
      if (!bot.adapters.language) {
        bot.logger.debug(`[thought] skip understand, no language adapter`)
      } else if (!(b.message instanceof bot.TextMessage)) {
        bot.logger.debug(`[thought] skip understand, not a text message`)
      } else if (b.message.toString().trim() === '') {
        bot.logger.debug(`[thought] skip understand, message text is empty`)
      } else {
        const nluResultsRaw = await bot.adapters.language.process(b.message)
        if (!nluResultsRaw || Object.keys(nluResultsRaw).length === 0) {
          bot.logger.error(`[thought] language processing returned empty`)
        } else {
          bot.logger.debug(`[thought] language processing returned keys [${Object.keys(nluResultsRaw).join(', ')}]`)
          b.message.nlu = new bot.NLU().addResults(nluResultsRaw)
          return true
        }
      }
      return false
    }

    // Wrap message in catch all before processing act listeners
    this.processes.act.validate = async () => {
      if (b.matched) return false
      if (b.message) b.message = new bot.CatchAllMessage(b.message)
      return true
    }

    // Connect response envelope to last listener before processing respond
    this.processes.respond.validate = async () => {
      if (!bot.adapters.message) {
        throw new Error('[thought] message adapter not found')
      }
      const envelope = b.pendingEnvelope()
      if (!envelope) return false
      const listener = b.getListener()
      if (listener) envelope.listenerId = listener.id
      return true
    }

    // Don't respond unless middleware completed (timestamped) with envelope
    this.processes.respond.action = async (success: boolean) => {
      if (success) {
        const envelope = b.respondEnvelope()
        await bot.adapters.message!.dispatch(envelope)
        envelope.responded = Date.now()
      }
    }

    // Don't remember states with unmatched messages
    this.processes.remember.validate = async () => {
      if (!b.matched && !b.dispatchedEnvelope()) return false
      return (typeof bot.adapters.storage !== 'undefined')
    }

    // Don't remember unless middleware completed (timestamped)
    this.processes.remember.action = async (success) => {
      if (success) await bot.keep('states', b)
    }
  }

  /** Trigger processing each thought in defined sequence. */
  async start (sequence: string) {
    if (!this.sequence[sequence]) throw new Error('[thought] invalid sequence')
    for (let process of this.sequence[sequence]) await this.processes[process].process()
    return this.b
  }
}

/**
 * Initiate sequence of thought processes for an incoming message.
 * Listener callbacks may also respond. Final state is remembered.
 */
export async function receive (message: bot.Message) {
  return new Thoughts(new bot.State({ message })).start('receive')
}

/**
 * Initiate a response from an existing state. Sequence does not remember
 * because it will usually by triggered from within the `receive` sequence.
 */
export async function respond (b: bot.State) {
  return new Thoughts(b).start('respond')
}

/**
 * Initiate chain of thought processes for an outgoing envelope.
 * This is for sending unprompted by a listener. Final state is remembered.
 */
export async function dispatch (envelope: bot.Envelope) {
  return new Thoughts(new bot.State({ envelopes: [envelope] })).start('dispatch')
}
