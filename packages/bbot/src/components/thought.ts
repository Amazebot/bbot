/**
 * Handles sequences of discourse with context.
 * @module components/thought
 */

import config from '../util/config'
import logger from '../util/logger'
import { users } from './user'
import { branches as globalBranches, BranchController, Branch } from './branch'
import { messages, TextMessage, Message, ServerMessage } from './message'
import { NLU } from './nlu'
import { Envelope } from './envelope'
import { State } from './state'
import dialogues from './dialogue'
import { store } from './store'
import { IContext } from './server'
import { adapters } from './adapter'
import middlewares, { Middleware } from './middleware'

/** Options for defining thought process. */
export interface IThought {
  name: string
  b: State
  validate?: () => Promise<boolean> | boolean
  action?: (success: boolean) => Promise<any> | any
  branches?: { [id: string]: Branch }
  middleware?: Middleware
}

/**
 * Defines a process to wrap execution of middleware of the same name.
 * Validators can prevent a process from running.
 * Actions can effect the state before the next process validates.
 */
export class Thought implements IThought {
  name: string
  b: State
  validate: () => Promise<boolean> | boolean = () => Promise.resolve(true)
  action: (success: boolean) => Promise<any> | any = (_) => Promise.resolve()
  middleware: Middleware
  branches?: { [id: string]: Branch }

  /**
   * Create new thought process with optional validate and action functions.
   * Presence of branches in options determines how middleware will execute.
   * Without middleware option, will the middleware of same name as the thought.
   */
  constructor (atts: IThought) {
    this.name = atts.name
    this.b = atts.b
    if (atts.validate) this.validate = atts.validate
    if (atts.action) this.action = atts.action
    if (atts.branches) this.branches = atts.branches
    this.middleware = (atts.middleware)
      ? atts.middleware
      : middlewares.get(this.name)
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
            await branches[id].execute(b, middleware)
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

/** Collection of Thought instances, extends object. */
export type ThoughtProcesses = object & { [key: string]: Thought }

/**
 * Collection of processes and branches to execute with middleware and state.
 * Will use global branches by default, but can be replaced with custom set.
 * Sequence arrays define orders of named processes, to run consecutively.
 * Default sequences are `receive` and `dispatch` to process incoming/outgoing.
 * Each process may have a `validate` method to run before processing and an
 * `action` method to run after. Validate returning false will skip the process.
 */
export class Thoughts {
  b: State
  branches: BranchController
  sequence: { [key: string]: string[] } = {
    serve: ['hear', 'serve', 'act', 'remember'],
    receive: ['hear', 'listen', 'understand', 'act', 'remember'],
    respond: ['respond'],
    dispatch: ['respond', 'remember']
  }
  processes: ThoughtProcesses

  /**
   * Start new instance of thought processes with optional branches to process.
   * By default will process global branches, but can accept an isolated
   * branches for specific conversational context.
   */
  constructor (
    state: State,
    initBranches?: BranchController
  ) {
    this.b = state
    this.branches = (initBranches)
      ? new BranchController(initBranches)
      : new BranchController(globalBranches)
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
      if (!success) this.b.finish()
    }

    // Only processed forced understand branches if listen branches matched
    this.processes.listen.action = async (success: boolean) => {
      if (success) this.branches.forced('understand')
    }

    // Get NLU result before processing NLU branches and only if required
    this.processes.understand.validate = async () => {
      if (!adapters.loaded.nlu) {
        logger.debug(`[thought] skip understand, no nlu adapter`)
      } else if (!(this.b.message instanceof TextMessage)) {
        logger.debug(`[thought] skip understand, not a text message`)
      } else if (this.b.message.toString().trim() === '') {
        logger.debug(`[thought] skip understand, message text is empty`)
      } else if (
        config.get('nlu-min-length') &&
        this.b.message.toString().trim().length < config.get('nlu-min-length')
      ) {
        logger.debug(`[thought] skip understand, message text too short`)
      } else {
        const nluResultsRaw = await adapters.loaded.nlu.process(this.b.message)
        if (!nluResultsRaw || Object.keys(nluResultsRaw).length === 0) {
          logger.error(`[thought] nlu processing returned empty`)
        } else {
          this.b.message.nlu = new NLU().addResults(nluResultsRaw)
          logger.info(`[thought] nlu processed ${this.b.message.nlu.printResults()}`)
          return true
        }
      }
      return false
    }

    // Wrap message in catch all before processing act branches
    this.processes.act.validate = async () => {
      if (this.b.matched) {
        logger.debug(`[thought] found match, clearing unforced catch branches`)
        this.branches.forced('act')
      }
      if (!this.branches.exist('act')) {
        logger.debug(`[thought] no catch branches remain, ending processing`)
        return false
      }
      if (this.b.message) {
        if (this.b.matched) logger.debug(`[thought] message matched, processing forced catch`)
        else logger.debug(`[thought] message unmatched, replacing with catch message type`)
        this.b.message = messages.catchAll(this.b.message)
      }
      return true
    }

    // Connect response envelope to last branch before processing respond
    this.processes.respond.validate = async () => {
      if (!adapters.loaded.message) {
        logger.error(`[thought] message adapter not found`)
        return false
      }
      const envelope = this.b.pendingEnvelope()
      if (!envelope) return false
      if (this.b.matchingBranch) envelope.branchId = this.b.matchingBranch.id
      return true
    }

    // Don't respond unless middleware completed (timestamped) with envelope
    this.processes.respond.action = async (success: boolean) => {
      if (success) {
        const envelope = this.b.respondEnvelope()
        await adapters.loaded.message!.dispatch(envelope)
        envelope.responded = Date.now()
      }
    }

    // Don't remember states with unmatched messages
    this.processes.remember.validate = async () => {
      if (this.b.sequence === 'respond') {
        logger.debug(`[thought] skip remember on respond`)
      } else if (!adapters.loaded.storage) {
        logger.debug(`[thought] skip remember, no storage adapter`)
      } else {
        logger.debug(`[thought] remembering ${this.b.matched ? 'matched state and user' : 'unmatched state'}`)
        if (this.b.matched) users.byId(this.b.message.user.id, this.b.message.user)
        return true
      }
      return false
    }

    // Don't remember unless middleware completed (timestamped)
    this.processes.remember.action = async (success) => {
      if (success) await store.keep('states', this.b)
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

/** Control creation of thought processes for incoming/outgoing sequences. */
export class ThoughtController {
  /**
   * Initiate sequence of thought processes for an incoming message.
   * Branch callbacks may also respond. Final state is remembered.
   *
   * If audience is engaged in dialogue, use the isolated dialogue path instead of
   * default "global" path. The dialogue path is then progressed to a clean path,
   * to allow adding a new set of branches upon matching the current ones.
   * If no branches matched, no new branches would be added to the new path, so
   * we revert to the previous path (the one that was just processed). If branches
   * matched, but no additional branches added, close the dialogue.
   */
  async receive (
    message: Message,
    branches?: BranchController
  ) {
    logger.info(`[thought] receive message ID ${message.id}`)
    const startingState = new State({ message })
    const dlg = dialogues.engaged(startingState)
    if (dlg && !branches) branches = dlg.progressBranches()
    const thought = new Thoughts(startingState, branches)
    const finalState = await thought.start('receive')
    if (dlg) {
      if (!finalState.resolved) dlg.revertBranches()
      else if (!dlg.branches.exist()) await dlg.close()
      logger.debug(JSON.stringify(dlg.branches))
    }
    return finalState
  }

  /** Initiate chain of thought processes for responding to a server request. */
  async serve (
    message: ServerMessage,
    context: IContext,
    branches?: BranchController
  ) {
    logger.info(`[thought] serving ${message.id} for ${message.user.id}`)
    const startingState = new State({ message, context })
    const dlg = dialogues.engaged(startingState)
    if (dlg && !branches) branches = dlg.progressBranches()
    const thought = new Thoughts(startingState, branches)
    const finalState = await thought.start('serve')
    if (dlg) {
      if (!finalState.matched) dlg.revertBranches()
      else if (dlg.branches.exist()) await dlg.close()
    }
    return finalState
  }

  /**
   * Initiate a response from an existing state. Sequence does not remember
   * because it will usually by triggered from within the `receive` sequence.
   */
  async respond (b: State) {
    if (!b.matchingBranch) logger.info(`[thought] respond without matched branch`)
    else logger.info(`[thought] respond to matched branch ${b.matchingBranch.id}`)
    return new Thoughts(b).start('respond')
  }

  /**
   * Initiate chain of thought processes for an outgoing envelope.
   * This is for sending unprompted by a branch. Final state is remembered.
   */
  async dispatch (envelope: Envelope) {
    logger.info(`[thought] dispatch envelope ${envelope.id}`)
    return new Thoughts(new State({ envelopes: [envelope] })).start('dispatch')
  }
}

export const thoughts = new ThoughtController()

export default thoughts
