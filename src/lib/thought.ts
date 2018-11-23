import * as bot from '..'

/** Options for defining thought process. */
export interface IThought {
  name: string
  b: bot.State
  validate?: () => Promise<boolean> | boolean
  action?: (success: boolean) => Promise<void> | void
  branches?: { [id: string]: bot.Branch }
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
  branches?: { [id: string]: bot.Branch }

  /**
   * Create new thought process with optional validate and action functions.
   * Presence of branches in options determines how middleware will execute.
   * Without middleware option, will the middleware of same name as the thought.
   */
  constructor (options: IThought) {
    this.name = options.name
    this.b = options.b
    if (options.validate) this.validate = options.validate
    if (options.action) this.action = options.action
    if (options.branches) this.branches = options.branches
    if (options.middleware) this.middleware = options.middleware
    else if (bot.middlewares[this.name]) this.middleware = bot.middlewares[this.name]
    else throw new Error('[thought] invalid middleware provided')
  }

  /**
   * Call validate, execute middleware, possibly branches, then action.
   * Will not enter process with empty branches or if state `done` is true.
   * Without branches, execute middleware, resolve on completion.
   * With branches, process each branch or until state `done` is true.
   * Action will be called with the boolean success of the process.
   * Process succeeds if middleware completed or branches were matched.
   * If process succeeds, timestamp is added to state.
   */
  async process () {
    if (this.b.exit) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const { b, name, validate, middleware, branches } = this
      if (typeof branches !== 'undefined') {
        if (Object.keys(branches).length === 0) {
          bot.logger.debug(`[thought] skip ${name}, no branches to process`)
          return reject()
        }
        if (b.done) {
          bot.logger.debug(`[thought] skip ${name}, branch processing is done`)
          return reject()
        }
      }
      Promise.resolve(validate())
        .then(async (valid) => {
          if (!valid) return reject()
          const branchCount = Object.keys(this.branches || {}).length
          const branchDetail = (branchCount)
            ? ` against ${branchCount} branch${branchCount > 1 ? 'es' : ''}`
            : ``
          if (b.message) {
            bot.logger.debug(`[thought] ${name} processing incoming message ID ${b.message.id}${branchDetail}`)
          } else if (b.envelopes) {
            bot.logger.debug(`[thought] ${name} processing outgoing envelopes${branchDetail}`)
          }
          if (typeof branches === 'undefined') return middleware.execute(b, resolve).then(reject)
          for (let id in branches) {
            if (b.done) break
            await branches[id].process(b, middleware)
          }
          return (b.matched) ? resolve() : reject()
        })
        .catch((err) => {
          bot.logger.debug(`[thought] ${name} validation error ${err.message}`)
          reject(err)
        })
    })
      .then(() => {
        if (!this.b.processed[this.name]) this.b.processed[this.name] = Date.now()
        return this.action(true)
      })
      .catch((err) => {
        if (err instanceof Error) {
          bot.logger.error(`[thought] ${this.name} error, ${err.message}`)
          throw err
        }
        return this.action(false)
      })
  }
}

/**
 * Collection of processes and branches to execute with middleware and state.
 * Will use global path by default, but can be replaced with custom set.
 * Sequence arrays define orders of named processes, to run consecutively.
 * Default sequences are `receive` and `dispatch` to process incoming/outgoing.
 * Each process may have a `validate` method to run before processing and an
 * `action` method to run after. Validate returning false will skip the process.
 */
export class Thoughts {
  b: bot.State | bot.State
  path: bot.Path
  sequence: { [key: string]: string[] } = {
    serve: ['hear', 'serve', 'act', 'remember'],
    receive: ['hear', 'listen', 'understand', 'act', 'remember'],
    respond: ['respond'],
    dispatch: ['respond', 'remember']
  }
  processes: { [key: string]: bot.Thought }

  /**
   * Start a new instance of thought processes with an optional path to process.
   * By default will process global path, but can accept an isolated path for
   * specific conversational context.
   */
  constructor (
    state: bot.State,
    path?: bot.Path
  ) {
    this.b = state
    this.path = (path) ? new bot.Path(path) : new bot.Path(bot.path)
    const { b } = this

    // Define processes with validation and post processing actions
    this.processes = {
      hear: new bot.Thought({ name: 'hear', b }),
      listen: new bot.Thought({ name: 'listen', b, branches: this.path.listen }),
      understand: new bot.Thought({ name: 'understand', b, branches: this.path.understand }),
      serve: new bot.Thought({ name: 'serve', b, branches: this.path.serve }),
      act: new bot.Thought({ name: 'act', b, branches: this.path.act }),
      respond: new bot.Thought({ name: 'respond', b }),
      remember: new bot.Thought({ name: 'remember', b })
    }

    // Ignore all further branches if hear process interrupted
    this.processes.hear.action = async (success: boolean) => {
      if (!success) b.finish()
    }

    // Only processed forced understand branches if listen branches matched
    this.processes.listen.action = async (success: boolean) => {
      if (success) this.path.forced('understand')
    }

    // Get NLU result before processing NLU branches and only if required
    this.processes.understand.validate = async () => {
      if (!bot.adapters.nlu) {
        bot.logger.debug(`[thought] skip understand, no nlu adapter`)
      } else if (!(b.message instanceof bot.TextMessage)) {
        bot.logger.debug(`[thought] skip understand, not a text message`)
      } else if (b.message.toString().trim() === '') {
        bot.logger.debug(`[thought] skip understand, message text is empty`)
      } else if (
        bot.settings.get('nlu-min-length') &&
        b.message.toString().trim().length < bot.settings.get('nlu-min-length')
      ) {
        bot.logger.debug(`[thought] skip understand, message text too short`)
      } else {
        const nluResultsRaw = await bot.adapters.nlu.process(b.message)
        if (!nluResultsRaw || Object.keys(nluResultsRaw).length === 0) {
          bot.logger.error(`[thought] nlu processing returned empty`)
        } else {
          b.message.nlu = new bot.NLU().addResults(nluResultsRaw)
          bot.logger.info(`[thought] nlu processed ${b.message.nlu.printResults()}`)
          return true
        }
      }
      return false
    }

    // Wrap message in catch all before processing act branches
    this.processes.act.validate = async () => {
      if (b.matched) return false
      if (b.message) b.message = new bot.CatchAllMessage(b.message)
      return true
    }

    // Connect response envelope to last branch before processing respond
    this.processes.respond.validate = async () => {
      if (!bot.adapters.message) {
        throw new Error('[thought] message adapter not found')
      }
      const envelope = b.pendingEnvelope()
      if (!envelope) return false
      const branch = b.getBranch()
      if (branch) envelope.branchId = branch.id
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
      if (b.matched) bot.userById(b.message.user.id, b.message.user)
      if (!bot.adapters.storage) {
        bot.logger.debug(`[thought] skip remember, no storage adapter`)
      } else if (!b.matched && !b.dispatchedEnvelope()) {
        bot.logger.debug(`[thought] skip remember on outgoing`)
      } else {
        return true
      }
      return false
    }

    // Don't remember unless middleware completed (timestamped)
    this.processes.remember.action = async (success) => {
      if (success) await bot.store.keep('states', b)
    }
  }

  /** Begin processing each thought in defined sequence. */
  async start (sequence: string) {
    if (!this.sequence[sequence]) throw new Error('[thought] invalid sequence')
    if (!this.b.sequence) this.b.sequence = sequence
    for (let process of this.sequence[sequence]) {
      await this.processes[process].process()
    }
    return this.b
  }
}

/**
 * Initiate sequence of thought processes for an incoming message.
 * Branch callbacks may also respond. Final state is remembered.
 *
 * If audience is engaged in dialogue, use the dialogue path instead of default
 * "global" path. The dialogue current path is then progressed to a clean path,
 * to allow adding a new set of branches upon matching the current ones.
 * If no branches matched, no new branches could be added to the new path, so
 * we revert to the previous path (the one that was just processed). If branches
 * matched, but no additional branches added, close the dialogue.
 */
export async function receive (message: bot.Message, path?: bot.Path) {
  const state = new bot.State({ message })
  const dialogue = bot.dialogue.engaged(state)
  if (dialogue && !path) path = dialogue.progressPath()
  const thought = new Thoughts(state, path)
  bot.logger.info(`[thought] receive message ID ${message.id}`)
  const final = await thought.start('receive')
  if (dialogue && !path) {
    if (!final.matched) dialogue.revertPath()
    else if (dialogue.path.hasBranches()) dialogue.close()
  }
  return final
}

/**
 * Initiate a response from an existing state. Sequence does not remember
 * because it will usually by triggered from within the `receive` sequence.
 */
export async function respond (b: bot.State) {
  if (!b.branch) {
    bot.logger.info(`[thought] respond without matched branch`)
  } else {
    bot.logger.info(`[thought] respond to matched branch ${b.branch.id}`)
  }
  return new Thoughts(b).start('respond')
}

/**
 * Initiate chain of thought processes for an outgoing envelope.
 * This is for sending unprompted by a branch. Final state is remembered.
 */
export async function dispatch (envelope: bot.Envelope) {
  bot.logger.info(`[thought] dispatch envelope ${envelope.id}`)
  return new Thoughts(new bot.State({ envelopes: [envelope] })).start('dispatch')
}

/** Initiate chain of thought processes for responding to a server request. */
export async function serve (
  message: bot.ServerMessage,
  context: bot.IServerContext,
  path?: bot.Path
) {
  bot.logger.info(`[thought] serving ${message.id} for ${message.user.id}`)
  return new Thoughts(new bot.State({ message, context }), path).start('serve')
}
