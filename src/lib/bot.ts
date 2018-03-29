/**
 * @module bot
 * The core bBot methods. Manages operational aspects like start/stopping,
 * logging, event emitting, the internal server and external connections as well
 * as managing middleware and executing the high level "thought process".
 */
import { loadAdapters, startAdapters } from './adapter'
import { events } from './events'
import { config } from './argv'
import { logger } from './logger'
import { loadMiddleware } from './middleware'

/**
 * Load all components.
 * Extensions/adapters can interrupt or modify the stack before start.
 */
export function load () {
  setState('loading')
  logger.debug('with config...', config)
  loadMiddleware()
  loadAdapters()
  // loadServer()
}

/**
 * Make it go!
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.start()
 */
export async function start () {
  setState('starting')
  await startAdapters()
  // await startSever()
  setState('ready')
  events.emit('ready')
}

const states: { [key: string]: 0 | 1 } = {
  loading: 0, starting: 0, ready: 0, shutdown: 0
}
function setState (set: 'loading' | 'starting' | 'ready' | 'shutdown') {
  for (let state of Object.keys(states)) states[state] = (set === state) ? 1 : 0
  if (set === 'loading') {
    logger.info(`${config.name} loading  . . . . . ~(0_0)~`)
  } else if (set === 'starting') {
    logger.info(`${config.name} starting . . . . . ┌(O_O)┘ bzzzt whirr`)
  } else if (set === 'ready') {
    logger.info(`${config.name} ready  . . . . . . ~(O_O)~ bleep bloop`)
  }
}
export function getState () {
  for (let state of Object.keys(states)) if (states[state] === 1) return state
}

/** @todo Add shutdown method */
/** @todo Add state method that is smarter than 'started' */
