import * as bot from '..'

/**
 * @module Dialogue
 * Manage isolated conversational paths and branches.
 *
 * Entering a dialogue with a user from an incoming state will route any further
 * input from that user to the dialogue path instead of the "global" bot path,
 * until the user exits the dialogue. Dialogues are self-exiting, if a path
 * timeout is called or a branch handler is processed without adding more
 * branches.
 *
 * The `path` attribute on a state will return the current dialogue path, so
 * `b.path` is the same as `bot.dialogue(options).path` for states with user
 * already in dialogue. If the state had no existing dialogue when `b.path` is
 * accessed, a new dialogue is created on the fly.
 *
 * @example <caption>Setup dialogue to enter from global branch (with timeout)</caption>
 *  const dialogue = bot.dialogue(options)
 *  dialogue.path.text(/hello/i, (b) => {
 *    b.respond(`Hello, would you like to view our inventory?`)
 *    dialogue.path.text(/no/i, (b) => b.respond(`OK, bye.`))
 *    dialogue.path.text(/yes/i, (b) => inventoryQuery(b))
 *    dialogue.path.timeout('Sorry, conversation timed out.', 1000)
 *  })
 *  bot.path.join((b) => dialogue.enter(b))
 * @example <caption>Use a custom function to add paths for current dialogue in state</caption>
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
 * @example <caption>Dispatch envelope, creating dialogue from outgoing state</caption>
 *  const envelope = new bot.Envelope({ user }).write('hello')
 *  const dialogue = bot.dialogue().enter(bot.dispatch(envelope))
 *  dialogue.path.text(/hello/i, (b) => {
 *    // ... as above
 *  })
 *  // dialogues can also be manually closed...
 *  bot.global.text(/quit all/, () => dialogue.exit())
 */

/**
 * Configure dialogue behaviour
 * @param timeout     Time to wait for input (set 0 for infinite)
 * @param timeoutText What to send on timeout
 * @param timeoutVia  How to send the timeout
 */
export interface IDialogue {
  timeout?: number
  timeoutText?: number
  timeoutVia?: string
  id?: string
}

/** Interface for timeout function with optional self override */
export interface IDialogueTimeout {
  (override?: IDialogueTimeout): void | Promise<void>
}

/** Add, remove and return paths, for managing end-to-end conversation flow. */
export class Dialogue implements IDialogue {
  timeout: number
  timeoutText: number
  timeoutVia: string
  id: string
  closed: boolean = false
  clock?: NodeJS.Timer
  openPath?: bot.Path
  onClose?: bot.IStateCallback
  onTimeout: IDialogueTimeout

  /**
   * Create and configure dialogue from options/defaults, link with state.
   * Default `onTimeout` method sends text, but the method can be overridden.
   */
  constructor (private state: bot.State, options: IDialogue = {}) {
    this.timeout = typeof options.timeout !== 'undefined'
      ? options.timeout
      : bot.settings.get('dialogue-timeout')
    this.timeoutText = options.timeoutText
      || bot.settings.get('dialogue-timeout-text')
    this.timeoutVia = options.timeoutVia || 'send'
    this.id = options.id || bot.id.counter('dialogue')
    this.state.dialogue = this // circular reference
    this.onTimeout = (override) => {
      if (override != null) {
        this.onTimeout = override
      } else if (this.timeoutText) {
        this.state.respondVia(this.timeoutVia, this.timeoutText)
      }
    }
  }

  open () {
    
  }

  receive () {

  }

  /** Close dialogue (if open) and call callback to disengage participants. */
  async close () {
    if (this.closed) return false
    if (typeof this.clock) this.stopClock()
    if (this.openPath) bot.logger.debug(`Dialogue ended ${this.state.matched ? '' : 'in'}complete`)
    else bot.logger.debug('Dialogue ended before paths added')
    if (this.onClose) await Promise.resolve(this.onClose(this.state))
    this.closed = true
    return true
  }

  /** Start (or restart) countdown for matching dialogue branches. */
  async startClock () {
    this.stopClock()
    this.clock = setTimeout(() => {
      bot.events.emit('timeout', this.state)
      try {
        this.onTimeout()
      } catch (err) {
        bot.logger.error(`[dialogue] timeout error: ${err.message}`)
      }
      delete this.clock
      this.close()
    }, this.timeout)
    return this.clock
  }

  /** Stop countdown for matching dialogue branches. */
  async stopClock () {
    if (this.clock) {
      clearTimeout(this.clock)
      delete this.clock
    }
  }

  /** Create or return existing path for this dialogue path */
  get path () {
    if (!this.openPath) this.openPath = new bot.Path({ scope: this.id })
    this.startClock() // restart whenever path accessed (to add branches)
    return this.openPath
  }
}
