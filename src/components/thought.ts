import config from '../controllers/config'
import logger from '../controllers/logger'
import adapters from '../controllers/adapters'
import store from '../controllers/store'
import users from '../controllers/users'
import messages from '../controllers/messages'
import middleware from '../controllers/middleware'
import { BranchController } from '../controllers/branches'
import { Middleware } from './middleware'
import * as state from './state'
import * as branch from './branch'
import * as message from './message'
import * as nlu from './nlu'

/** How the bot handles discourse. */

/** Options for defining thought process. */
export interface IThought {
  name: string
  b: state.State
  validate?: () => Promise<boolean> | boolean
  action?: (success: boolean) => Promise<void> | void
  branches?: { [id: string]: branch.Branch }
  middleware?: Middleware
}

/**
 * Defines a process to wrap execution of middleware of the same name.
 * Validators can prevent a process from running.
 * Actions can effect the state before the next process validates.
 */
export class Thought implements IThought {
  name: string
  b: state.State
  validate: () => Promise<boolean> | boolean = () => Promise.resolve(true)
  action: (success: boolean) => Promise<void> | void = (_) => Promise.resolve()
  middleware: Middleware
  branches?: { [id: string]: branch.Branch }

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
    else if (middleware.get(this.name)) this.middleware = middleware.get(this.name)
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
          logger.debug(`[thought] skip ${name}, no branches to process`)
          return reject()
        }
        if (b.done) {
          logger.debug(`[thought] skip ${name}, branch processing is done`)
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
            logger.debug(`[thought] ${name} processing incoming message ID ${b.message.id}${branchDetail}`)
          } else if (b.envelopes) {
            logger.debug(`[thought] ${name} processing outgoing envelopes${branchDetail}`)
          }
          if (typeof branches === 'undefined') return middleware.execute(b, resolve).then(reject)
          for (let id in branches) {
            if (b.done) break
            await branches[id].process(b, middleware)
          }
          return (b.matched) ? resolve() : reject()
        })
        .catch((err) => {
          logger.debug(`[thought] ${name} validation error ${err.message}`)
          reject(err)
        })
    })
      .then(() => {
        if (!this.b.processed[this.name]) this.b.processed[this.name] = Date.now()
        return this.action(true)
      })
      .catch((err) => {
        if (err instanceof Error) {
          logger.error(`[thought] ${this.name} error, ${err.message}`)
          throw err
        }
        return this.action(false)
      })
  }
}

/**
 * Collection of processes and branches to execute with middleware and state.
 * Will use global branches by default, but can be replaced with custom set.
 * Sequence arrays define orders of named processes, to run consecutively.
 * Default sequences are `receive` and `dispatch` to process incoming/outgoing.
 * Each process may have a `validate` method to run before processing and an
 * `action` method to run after. Validate returning false will skip the process.
 */
export class Thoughts {
  b: state.State
  branches: BranchController
  sequence: { [key: string]: string[] } = {
    serve: ['hear', 'serve', 'act', 'remember'],
    receive: ['hear', 'listen', 'understand', 'act', 'remember'],
    respond: ['respond'],
    dispatch: ['respond', 'remember']
  }
  processes: { [key: string]: Thought }

  /**
   * Start new instance of thought processes with optional branches to process.
   * By default will process global branches, but can accept an isolated
   * branches for specific conversational context.
   */
  constructor (
    state: state.State,
    initBranches?: BranchController
  ) {
    this.b = state
    this.branches = new BranchController(initBranches)
    const { b } = this

    // Define processes with validation and post processing actions
    this.processes = {
      hear: new Thought({
        name: 'hear', b
      }),
      listen: new Thought({
        name: 'listen', b, branches: this.branches.listen
      }),
      understand: new Thought({
        name: 'understand', b, branches: this.branches.understand
      }),
      serve: new Thought({
        name: 'serve', b, branches: this.branches.serve
      }),
      act: new Thought({
        name: 'act', b, branches: this.branches.act
      }),
      respond: new Thought({
        name: 'respond', b
      }),
      remember: new Thought({
        name: 'remember', b
      })
    }

    // Ignore all further branches if hear process interrupted
    this.processes.hear.action = async (success: boolean) => {
      if (!success) b.finish()
    }

    // Only processed forced understand branches if listen branches matched
    this.processes.listen.action = async (success: boolean) => {
      if (success) this.branches.forced('understand')
    }

    // Get NLU result before processing NLU branches and only if required
    this.processes.understand.validate = async () => {
      if (!adapters.loaded.nlu) {
        logger.debug(`[thought] skip understand, no nlu adapter`)
      } else if (!(b.message instanceof message.Text)) {
        logger.debug(`[thought] skip understand, not a text message`)
      } else if (b.message.toString().trim() === '') {
        logger.debug(`[thought] skip understand, message text is empty`)
      } else if (
        config.get('nlu-min-length') &&
        b.message.toString().trim().length < config.get('nlu-min-length')
      ) {
        logger.debug(`[thought] skip understand, message text too short`)
      } else {
        const nluResultsRaw = await adapters.loaded.nlu.process(b.message)
        if (!nluResultsRaw || Object.keys(nluResultsRaw).length === 0) {
          logger.error(`[thought] nlu processing returned empty`)
        } else {
          b.message.nlu = nlu.create().addResults(nluResultsRaw)
          logger.info(`[thought] nlu processed ${b.message.nlu.printResults()}`)
          return true
        }
      }
      return false
    }

    // Wrap message in catch all before processing act branches
    this.processes.act.validate = async () => {
      if (b.matched) return false
      if (b.message) b.message = messages.catchAll(b.message)
      return true
    }

    // Connect response envelope to last branch before processing respond
    this.processes.respond.validate = async () => {
      if (!adapters.loaded.message) {
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
        await adapters.loaded.message!.dispatch(envelope)
        envelope.responded = Date.now()
      }
    }

    // Don't remember states with unmatched messages
    this.processes.remember.validate = async () => {
      if (b.matched) users.byId(b.message.user.id, b.message.user)
      if (!adapters.loaded.storage) {
        logger.debug(`[thought] skip remember, no storage adapter`)
      } else if (!b.matched && !b.dispatchedEnvelope()) {
        logger.debug(`[thought] skip remember on outgoing`)
      } else {
        return true
      }
      return false
    }

    // Don't remember unless middleware completed (timestamped)
    this.processes.remember.action = async (success) => {
      if (success) await store.keep('states', b)
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
