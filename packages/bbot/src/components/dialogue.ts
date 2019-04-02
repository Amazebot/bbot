/**
 * Manage isolated conversational branches in context.
 * @module components/dialogue
 */

import config from '../util/config'
import logger from '../util/logger'
import { counter } from '../util/id'
import { State, ICallback } from './state'
import { BranchController, IBranches } from './branch'

/**
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
export interface IDialogue {
  timeout?: number
  timeoutText?: string
  timeoutMethod?: string
  id?: string
  audience?: 'direct' | 'user' | 'room'
  defaultBranches?: IBranches
}

/** Add, remove and return branch sets, for managing conversation flow. */
export class Dialogue implements IDialogue {
  timeout: number
  timeoutText: string
  timeoutMethod: string
  id: string
  audience: 'direct' | 'user' | 'room'
  defaultBranches: IBranches = {}
  branchHistory: BranchController[] = []
  state?: State
  clock?: NodeJS.Timer
  onOpen?: ICallback
  onClose?: ICallback
  onTimeout?: ICallback

  /**
   * Create and configure dialogue from options/defaults, link with state.
   * Default `onTimeout` method sends text, but the method can be overridden.
   */
  constructor (atts: IDialogue = {}) {
    this.timeout = typeof atts.timeout !== 'undefined' ? atts.timeout
      : config.get('dialogue-timeout')
    this.timeoutText = atts.timeoutText
      || config.get('dialogue-timeout-text')
    this.timeoutMethod = atts.timeoutMethod
    || config.get('dialogue-timeout-method')
    this.id = atts.id || counter('dialogue')
    this.audience = atts.audience || 'direct'
    this.onTimeout = (b) => {
      if (!this.timeoutText) return
      b.respondVia(this.timeoutMethod, this.timeoutText)
        .catch((err: Error) => {
          logger.error(`[dialogue] timeout response error: ${err.message}`)
        })
    }
  }

  /** Open dialogue and call optional callback (e.g. send opening message) */
  async open (state: State) {
    this.state = state
    if (this.onOpen) {
      await Promise.resolve(this.onOpen(this.state))
        .catch((err) => {
          logger.error(`[dialogue] open error: ${err.message}`)
          throw err
        })
    }
    dialogues.engage(this.state, this)
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
      logger.debug('Dialogue closed, no active branches')
    }
    if (this.onClose) {
      await Promise.resolve(this.onClose(this.state))
        .catch((err) => {
          logger.error(`[dialogue] close error: ${err.message}`)
          throw err
        })
    }
    dialogues.disengage(this.state, this)
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

/** Track and interact with current dialogues and engaged participants. */
export class DialogueController {
  /** Collection of open current assigned to their audience ID. */
  current: { [id: string]: Dialogue } = {}

  /** Stop timers and clear collection of current (for tests) */
  reset () {
    for (let id in this.current) {
      this.current[id].stopClock()
      delete this.current[id]
    }
  }

  /** Get set of possible audience IDs for a given  */
  audiences (b: State) {
    return {
      direct: `${b.message.user.id}_${b.message.user.room.id}`,
      user: `${b.message.user.id}`,
      room: `${b.message.user.room.id}`
    }
  }

  /** Check if audience ID has an open dialogue. */
  audienceEngaged (id: string) {
    return (Object.keys(this.current).indexOf(id) > -1)
  }

  /** Get the ID of engaged audience from current state (if any). */
  engagedId (b: State) {
    const audienceIds = this.audiences(b)
    if (this.audienceEngaged(audienceIds.direct)) return audienceIds.direct
    else if (this.audienceEngaged(audienceIds.user)) return audienceIds.user
    else if (this.audienceEngaged(audienceIds.room)) return audienceIds.room
  }

  /** Find an open dialogue from state for any possibly engaged audience. */
  engaged (b: State) {
    const audienceId = this.engagedId(b)
    if (audienceId) return this.current[audienceId]
  }

  /** Add an audience from state to a given dialogue. */
  engage (b: State, dialogue: Dialogue) {
    const audienceId = this.audiences(b)[dialogue.audience]
    this.current[audienceId] = dialogue
  }

  /** Remove the audience from any dialogue or a given dialogue. */
  disengage (b: State, dialogue?: Dialogue) {
    const audienceId = (dialogue)
      ? this.audiences(b)[dialogue.audience]
      : this.engagedId(b)
    if (audienceId) delete this.current[audienceId]
  }
}

export const dialogues = new DialogueController()

export default dialogues
