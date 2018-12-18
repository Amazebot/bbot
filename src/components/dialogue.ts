import { counter } from '../utils/id'
import logger from '../controllers/logger'
import config from '../controllers/config'
import * as state from './state'
import { BranchController, IBranches } from '../controllers/branches'

/**
 * Manage isolated conversational branches (in context).
 *
 * Opening a dialogue will route any further input from the user/s in state to
 * the dialogue branches instead of the "global" bot branches, until closed.
 * Dialogues are self-closing on timeout, or if a branch handler is processed
 * without adding more branches.
 *
 * When accessing branches from the current state (`b.branches` instead of
 * `bot.branches`) any created branches will be isolated by the state's dialogue
 * and not accessible to users not engaged in that dialogue. Also, users in that
 * dialogue will have their incoming messages routed to only match against the
 * branches in the dialogue branches. i.e. they will not trigger "global" bot
 * branches (until closing dialogue)
 *
 * By accessing the state's branches, a dialogue is implicitly created for the
 * state with default config. However, it can be explicitly created first, to
 * configure specific behaviour, like custom timeouts or multi-user audiences.
 *
 * The `audience` property determines which user or users related to the state
 * are in dialogue (to route their input). It can be configured a few ways:
 *  - `direct` (default) the user in the current room
 *  - `user` the user in any room (to continue dialogue across multiple rooms)
 *  - `room` all users in the current room (allows anyone to continue dialogue)
 *
 * @example <caption>Put user into dialogue from a global branch</caption>
 *  bot.branches.text(/hello/i, (b) => {
 *    b.respond(`Hello, do you want to see our inventory?`)
 *    b.branches.text(/no/i, (b) => b.respond(`OK, bye.`)) // auto-close dialogue
 *    b.branches.text(/yes/i, (b) => inventoryQuery(b)) // add more branches here
 *  })
 * @example <caption>Put user into pre-defined dialogue from multiple events</caption>
 *  const dialogue = bot.dialogue.create(options)
 *  dialogue.onOpen = (b) => {
 *    b.respond(`Hello, do you want to see our inventory?`)
 *    b.branches.text(/no/i, (b) => b.respond(`OK, bye.`)) // auto-close dialogue
 *    b.branches.text(/yes/i, (b) => inventoryQuery(b)) // add more branches here
 *  }
 *  bot.branches.text(/hello/i, (b) => dialogue.open(b))
 *  bot.branches.enter((b) => dialogue.open(b))
 * @example <caption>Dispatch envelope, opening dialogue for outgoing state</caption>
 *  const envelope = bot.envelope.create({ user })
 *  envelope.write('Hello, do you want to see our inventory?')
 *  const dialogue = bot.dialogue.create(options)
 *  const state = bot.thought.dispatch(envelope)
 *  dialogue.open(state)
 *  dialogue.branches.text(/no/i, (b) => b.respond(`O
 * K, bye.`))
 *  dialogue.branches.text(/yes/i, (b) => inventoryQuery(b))
 *  dialogue.branches.text(/quit/i, (b) => dialogue.close())
 * @example <caption>Use function to add branches for current state dialogue</caption>
 *  function inventoryQuery((b) => {
 *    b.respond('OK, I can show you *cars*, or *bikes*?')
 *    b.branches.text(/car/i, (b) => {
 *      b.respond('*Blue* or *red*')
 *      b.branches.text(/blue/i, (b) => b.respond('🚙'))
 *      b.branches.text(/red/i, (b) => b.respond('🚗'))
 *    })
 *    b.branches.text(/bike/i, (b) => {
 *      b.respond('*Blue* or *red*')
 *      b.branches.text(/blue/i, (b) => b.respond('🚵‍♂️'))
 *      b.branches.text(/red/i, (b) => b.respond('🚵‍♀️'))
 *    })
 *  })
 */
/**
 * Configure dialogue behaviour
 * @param timeout         Time to wait for input (set 0 for infinite)
 * @param timeoutText     What to send on timeout
 * @param timeoutMethod   How to send the timeout
 * @param id              Identifier for dialogue in logs
 * @param audience        Type of audience to engage
 * @param defaultBranches Default values for new branches
 */
export interface IOptions {
  timeout?: number
  timeoutText?: string
  timeoutMethod?: string
  id?: string
  audience?: 'direct' | 'user' | 'room'
  defaultBranches?: IBranches
}

/** Add, remove and return branch sets, for managing conversation flow. */
export class Dialogue implements IOptions {
  timeout: number
  timeoutText: string
  timeoutMethod: string
  id: string
  audience: 'direct' | 'user' | 'room'
  defaultBranches: IBranches = {}
  branchHistory: BranchController[] = []
  state?: state.State
  clock?: NodeJS.Timer
  onOpen?: state.ICallback
  onClose?: state.ICallback
  onTimeout?: state.ICallback

  /**
   * Create and configure dialogue from options/defaults, link with state.
   * Default `onTimeout` method sends text, but the method can be overridden.
   */
  constructor (options: IOptions = {}) {
    this.timeout = typeof options.timeout !== 'undefined' ? options.timeout
      : config.get('dialogue-timeout')
    this.timeoutText = options.timeoutText
      || config.get('dialogue-timeout-text')
    this.timeoutMethod = options.timeoutMethod
    || config.get('dialogue-timeout-method')
    this.id = options.id || counter('dialogue')
    this.audience = options.audience || 'direct'
    this.onTimeout = (b) => {
      if (!this.timeoutText) return
      b.respondVia(this.timeoutMethod, this.timeoutText)
        .catch((err: Error) => {
          logger.error(`[dialogue] timeout response error: ${err.message}`)
        })
    }
  }

  /** Open dialogue and call optional callback (e.g. send opening message) */
  async open (state: state.State) {
    this.state = state
    if (this.onOpen) {
      await Promise.resolve(this.onOpen(this.state))
        .catch((err) => {
          logger.error(`[dialogue] open error: ${err.message}`)
          throw err
        })
    }
    engage(this.state, this)
    return true
  }

  /** Close dialogue (if open), call callback and disengage audience. */
  async close () {
    if (!this.state) {
      logger.debug(`[dialogue] Closed ${this.id} without state (never opened)`)
      return false
    }
    this.stopClock()
    if (this.branches.exist()) {
      logger.debug(`Dialogue closed ${this.state.matched ? '' : 'in'}complete`)
    } else {
      logger.debug('Dialogue closed before branches added')
    }
    if (this.onClose) {
      await Promise.resolve(this.onClose(this.state))
        .catch((err) => {
          logger.error(`[dialogue] close error: ${err.message}`)
          throw err
        })
    }
    disengage(this.state, this)
    return true
  }

  /** Start (or restart) countdown for matching dialogue branches. */
  startClock (ms?: number) {
    if (!this.state) throw new Error(`[dialogue] Timeout started without state: ${this.id}`)
    if (typeof ms === 'undefined') ms = this.timeout
    if (ms === 0) return
    this.stopClock()
    this.clock = setTimeout(async () => {
      delete this.clock
      if (this.onTimeout) {
        await Promise.resolve(this.onTimeout(this.state!))
        .catch((err) => {
          logger.error(`[dialogue] timeout error: ${err.message}`)
          throw err
        })
      }
      return this.close()
    }, ms)
    return this.clock
  }

  /** Stop countdown for matching dialogue branches. */
  stopClock () {
    if (this.clock) {
      clearTimeout(this.clock)
      delete this.clock
    }
  }

  /** Create/return current branches and start timer (e.g. on adding branches). */
  get branches () {
    this.startClock()
    if (!this.branchHistory.length) {
      this.branchHistory.push(new BranchController(this.defaultBranches))
    }
    return this.branchHistory[this.branchHistory.length - 1]
  }

  /** Return current branches, adding a new set to the top of the stack. */
  progressBranches () {
    const cloneBranches = this.branchHistory.slice(-1).pop()
    this.branchHistory.push(new BranchController(this.defaultBranches))
    return cloneBranches
  }

  /** Remove current branches from stack, returning the previous. */
  revertBranches () {
    this.branchHistory.pop()
    return this.branches
  }
}

/** Collection of open dialogues assigned to their audience ID. */
export const dialogues: { [id: string]: Dialogue } = {}

/** Stop timers and clear collection of dialogues (for tests) */
export const reset = () => {
  for (let id in dialogues) {
    dialogues[id].stopClock()
    delete dialogues[id]
  }
}

/** Get set of possible audience IDs for a given state. */
export const audiences = (b: state.State) => {
  return {
    direct: `${b.message.user.id}_${b.message.user.room.id}`,
    user: `${b.message.user.id}`,
    room: `${b.message.user.room.id}`
  }
}

/** Check if audience ID has an open dialogue. */
export const audienceEngaged = (id: string) => (Object.keys(dialogues).indexOf(id) > -1)

/** Get the ID of engaged audience from current state (if any). */
export const engagedId = (b: state.State) => {
  const audienceIds = audiences(b)
  if (audienceEngaged(audienceIds.direct)) return audienceIds.direct
  else if (audienceEngaged(audienceIds.user)) return audienceIds.user
  else if (audienceEngaged(audienceIds.room)) return audienceIds.room
}

/** Find an open dialogue from state for any possibly engaged audience. */
export const engaged = (b: state.State) => {
  const audienceId = engagedId(b)
  if (audienceId) return dialogues[audienceId]
}

/** Add an audience from state to a given dialogue. */
export const engage = (b: state.State, dialogue: Dialogue) => {
  const audienceId = audiences(b)[dialogue.audience]
  dialogues[audienceId] = dialogue
}

/** Remove the audience from any dialogue or a given dialogue. */
export const disengage = (b: state.State, dialogue?: Dialogue) => {
  const audienceId = (dialogue)
    ? audiences(b)[dialogue.audience]
    : engagedId(b)
  if (audienceId) delete dialogues[audienceId]
}
