import { logger, settings, id, state, path } from '.'

/**
 * Manage isolated conversational paths and branches.
 *
 * Opening a dialogue will route any further input from the user/s in state to
 * the dialogue path instead of the "global" bot path, until closed. Dialogues
 * are self-closing on timeout, or if a branch handler is processed without
 * adding more branches.
 *
 * When accessing a path from the current state (`b.path`) instead of the bot
 * (`bot.path`) any created branches will be isolated by the state's dialogue
 * and not accessible to users not engaged in that dialogue. Also, users in that
 * dialogue will have their incoming messages routed to only match against the
 * branches in the dialogue path. i.e. they will not trigger "global" bot path
 * branches (until closing dialogue)
 *
 * By accessing the state's path, a dialogue is implicitly created for the state
 * with default config. However, it can be explicitly created first, to
 * configure specific behaviour, like custom timeouts or multi-user audiences.
 *
 * The `audience` property determines which user or users related to the state
 * are in dialogue (to route their input). It can be configured a few ways:
 *  - `direct` (default) the user in the current room
 *  - `user` the user in any room (to continue dialogue across multiple rooms)
 *  - `room` all users in the current room (allows anyone to continue dialogue)
 *
 * @example <caption>Put user into dialogue path from a global path branch</caption>
 *  bot.path.text(/hello/i, (b) => {
 *    b.respond(`Hello, do you want to see our inventory?`)
 *    b.path.text(/no/i, (b) => b.respond(`OK, bye.`)) // auto-close dialogue
 *    b.path.text(/yes/i, (b) => inventoryQuery(b)) // add more branches here
 *  })
 * @example <caption>Put user into pre-defined dialogue from multiple events</caption>
 *  const dialogue = bot.dialogue.create(options)
 *  dialogue.onOpen = (b) => {
 *    b.respond(`Hello, do you want to see our inventory?`)
 *    b.path.text(/no/i, (b) => b.respond(`OK, bye.`)) // auto-close dialogue
 *    b.path.text(/yes/i, (b) => inventoryQuery(b)) // add more branches here
 *  }
 *  bot.path.text(/hello/i, (b) => dialogue.open(b))
 *  bot.path.enter((b) => dialogue.open(b))
 * @example <caption>Dispatch envelope, opening dialogue for outgoing state</caption>
 *  const envelope = bot.envelope.create({ user })
 *  envelope.write('Hello, do you want to see our inventory?')
 *  const dialogue = bot.dialogue.create(options)
 *  const state = bot.thought.dispatch(envelope)
 *  dialogue.open(state)
 *  dialogue.path.text(/no/i, (b) => b.respond(`O
 * K, bye.`))
 *  dialogue.path.text(/yes/i, (b) => inventoryQuery(b))
 *  dialogue.path.text(/quit/i, (b) => dialogue.close())
 * @example <caption>Use function to add paths for current state dialogue</caption>
 *  function inventoryQuery((b) => {
 *    b.respond('OK, I can show you *cars*, or *bikes*?')
 *    b.path.text(/car/i, (b) => {
 *      b.respond('*Blue* or *red*')
 *      b.path.text(/blue/i, (b) => b.respond('🚙'))
 *      b.path.text(/red/i, (b) => b.respond('🚗'))
 *    })
 *    b.path.text(/bike/i, (b) => {
 *      b.respond('*Blue* or *red*')
 *      b.path.text(/blue/i, (b) => b.respond('🚵‍♂️'))
 *      b.path.text(/red/i, (b) => b.respond('🚵‍♀️'))
 *    })
 *  })
 */
export namespace dialogue {
  /**
   * Configure dialogue behaviour
   * @param timeout     Time to wait for input (set 0 for infinite)
   * @param timeoutText What to send on timeout
   * @param timeoutMethod  How to send the timeout
   * @param id          Identifier for dialogue in logs
   * @param audience    Type of audience to engage
   * @param defaultPath Default values for new paths
   */
  export interface IOptions {
    timeout?: number
    timeoutText?: string
    timeoutMethod?: string
    id?: string
    audience?: 'direct' | 'user' | 'room'
    defaultPath?: path.IOptions
  }

  /** Add, remove and return paths, for managing end-to-end conversation flow. */
  export class Dialogue implements IOptions {
    timeout: number
    timeoutText: string
    timeoutMethod: string
    id: string
    audience: 'direct' | 'user' | 'room'
    defaultPath: path.IOptions = {}
    paths: path.Path[] = []
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
        : settings.get('dialogue-timeout')
      this.timeoutText = options.timeoutText
        || settings.get('dialogue-timeout-text')
      this.timeoutMethod = options.timeoutMethod
      || settings.get('dialogue-timeout-method')
      this.id = options.id || id.counter('dialogue')
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
      if (this.path.hasBranches()) {
        logger.debug(`Dialogue closed ${this.state.matched ? '' : 'in'}complete`)
      } else {
        logger.debug('Dialogue closed before paths added')
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

    /** Start (or restart) countdown for matching dialogue path branches. */
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

    /** Create/return current path and start timer (e.g. on adding branches). */
    get path () {
      this.startClock()
      if (!this.paths.length) this.paths.push(path.create(this.defaultPath))
      return this.paths[this.paths.length - 1]
    }

    /** Return the current path, adding a new one to the top of the stack. */
    progressPath () {
      const clonePath = this.paths.slice(-1).pop()
      this.paths.push(path.create(this.defaultPath))
      return clonePath
    }

    /** Remove the current path from stack, returning the previous. */
    revertPath () {
      this.paths.pop()
      return this.path
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

  /** Create a new dialogue. Proxy for `new bot.dialogue.Dialogue` */
  export const create = (options?: IOptions) => new Dialogue(options)
}
