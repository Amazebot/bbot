import { promisify } from 'util'

import * as id from './util/id'
import config from './util/config'
import logger from './util/logger'
import events from './util/events'
import request from './util/request'

import caches from './components/cache'
import server from './components/server'
import middlewares from './components/middleware'
import thoughts from './components/thought'
import branches from './components/branch'
import messages from './components/message'
import envelopes from './components/envelope'
import bits from './components/bit'
import dialogues from './components/dialogue'
import { makeAdapterController } from './components/adapter'
import { MemoryController } from './components/memory'
import { RoomController } from './components/room'
import { makeUserController } from './components/user'

/** Possible operational statuses. */
export enum Status {
  waiting = 'waiting',
  loading = 'loading',
  loaded = 'loaded',
  starting = 'starting',
  started = 'started',
  shutdown = 'shutdown'
}
export type StatusKey = keyof typeof Status

/** Primary parent class for bBot import typing. */
export class Bot {
  id = id
  config = config
  logger = logger
  events = events

  /* @todo refactor all with new composition pattern */
  request = request
  caches = caches
  server = server
  messages = messages
  envelopes = envelopes
  bits = bits
  branches = branches
  middlewares = middlewares
  dialogues = dialogues
  thoughts = thoughts

  adapter = makeAdapterController(this)
  memory = new MemoryController(this)
  user = makeUserController(this)
  rooms = new RoomController(this) /** @todo refactor all pluralised names */

  /** @deprecated - Update usage of `bot.global` to `bot.branches`. */
  global = branches

  /** Internal index for loading status. */
  status: Status

  /** Await helper, pauses for event loop. */
  eventDelay = promisify(setImmediate)

  /** Create a bot instance, with config options. */
  constructor (options: { [key: string]: any } = {}) {
    this.status = Status.waiting
    for (let key in options) this.config.set(key, options[key])
  }

  /** Find out where the loading or shutdown process is at. */
  getStatus () {
    return this.status.toString()
  }

  /** Private helper for setting and logging loading status. */
  setStatus (set: StatusKey) {
    this.status = Status[set]
    switch (this.status) {
      case Status.loading:
        this.logger.info(`[core] ${config.get('name')} loading  . . . . . ~(0_0)~`)
        break
      case Status.starting:
        this.logger.info(`[core] ${config.get('name')} starting . . . . . ┌(O_O)┘ bzzzt whirr`)
        break
      case Status.started:
        this.logger.info(`[core] ${config.get('name')} started  . . . . . ~(O_O)~ bleep bloop`)
        break
    }
  }

  /**
   * Load all components.
   * Extensions/adapters can interrupt or modify the stack before start.
   */
  async load () {
    if (this.status !== Status.waiting) await this.reset()
    this.status = Status.loading
    logger.level = config.get('log-level') // may change after init
    try {
      this.config.load()
      this.middlewares.loadAll()
      this.server.load()
      this.adapter.loadAll()
      await this.eventDelay()
      this.status = Status.loaded
      this.events.emit('loaded')
    } catch (err) {
      this.logger.error('[core] failed to load')
      await this.shutdown(1).catch()
    }
  }

  /** Make it go! */
  async start () {
    if (this.status !== Status.loaded) await this.load()
    this.status = Status.starting
    try {
      await this.server.start()
      await this.adapter.startAll()
      await this.memory.start()
    } catch (err) {
      logger.error('[core] failed to start')
      await this.shutdown(1).catch()
    }
    await this.eventDelay()
    this.status = Status.started
    this.events.emit('started')
  }

  /**
   * Make it stop!
   * Stops responding but keeps history and loaded components.
   * Will wait until started if shutdown called while starting.
   */
  async shutdown (exit = 0) {
    if (this.status === Status.shutdown) return
    if (this.status === Status.loading) {
      await new Promise((resolve) => this.events.on('loaded', () => resolve()))
    } else if (this.status === Status.starting) {
      await new Promise((resolve) => this.events.on('started', () => resolve()))
    }
    await this.memory.shutdown()
    await this.adapter.shutdownAll()
    this.server.shutdown()
    await this.eventDelay()
    this.status = Status.shutdown
    this.events.emit('shutdown')
    if (exit) process.exit(exit)
  }

  /**
   * Stop temporarily.
   * Allow start to be called again without reloading
   */
  async pause () {
    await this.shutdown()
    await this.eventDelay()
    this.setStatus('loaded')
    this.events.emit('paused')
  }

  /**
   * Scrub it clean!
   * Would allow redefining classes before calling start again, mostly for tests.
   */
  async reset () {
    if (this.status !== Status.shutdown) await this.shutdown()
    try {
      this.adapter.unloadAll()
      this.middlewares.unloadAll()
      this.branches.reset()
      this.config.reset()
      this.caches.reset()
    } catch (err) {
      this.logger.error('[core] failed to reset')
      await this.shutdown(1).catch()
    }
    await this.eventDelay()
    this.status = Status.waiting
    this.events.emit('waiting')
  }
}

/** Bot instance, almost always imported instead of class. */
export const bBot = new Bot()

/** Default export made available for different import/requires usage. */
export default bBot
