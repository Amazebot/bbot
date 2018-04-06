/**
 * @module bot
 * The core bBot methods. Manages operational aspects like start/stopping,
 * logging, event emitting, the internal server and external connections as well
 * as managing middleware and executing the high level "thought process".
 */
import { promisify } from 'util'
import { loadAdapters, startAdapters, unloadAdapters } from './adapter'
import { events } from './events'
import { config } from './argv'
import { logger } from './logger'
import { loadMiddleware, unloadMiddleware } from './middleware'

const setImmediatePromise = promisify(setImmediate)
const states: { [key: string]: 0 | 1 } = {
  waiting: 1, loading: 0, loaded: 0, starting: 0, ready: 0, shutdown: 0
}

/**
 * Private helper for setting and logging loading states.
 */
function setState (set: 'waiting' | 'loading' | 'loaded' | 'starting' | 'ready' | 'shutdown') {
  for (let state of Object.keys(states)) states[state] = (set === state) ? 1 : 0
  if (set === 'loading') {
    logger.info(`${config.name} loading  . . . . . ~(0_0)~`)
  } else if (set === 'starting') {
    logger.info(`${config.name} starting . . . . . ┌(O_O)┘ bzzzt whirr`)
  } else if (set === 'ready') {
    logger.info(`${config.name} ready  . . . . . . ~(O_O)~ bleep bloop`)
  }
}

/**
 * Find out where the loading or shutdown process is at.
 */
export function getState (): string {
  for (let state of Object.keys(states)) if (states[state] === 1) return state
  return 'broken' // should never get here
}

/**
 * Load all components.
 * Extensions/adapters can interrupt or modify the stack before start.
 */
export async function load (): Promise<void> {
  if (getState() !== 'waiting') await reset()
  setState('loading')
  logger.debug('Using config:', config)
  loadMiddleware()
  loadAdapters()
  // loadServer()
  await setImmediatePromise()
  setState('loaded')
}

/**
 * Make it go!
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.start()
 */
export async function start (): Promise<void> {
  if (getState() !== 'loaded') await load()
  setState('starting')
  await startAdapters()
  // await startSever()
  setState('ready')
  await setImmediatePromise()
  events.emit('ready')
}

/**
 * Make it stop!
 * Stops responding but keeps history and loaded components
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.shutdown()
 */
export async function shutdown (): Promise<void> {
  // shutdown server
  // stop thought process
  await setImmediatePromise()
  setState('shutdown')
}

/**
 * Stop temporarily.
 * Allow start to be called again without reloading
 */
export async function pause (): Promise<void> {
  if (getState() !== 'ready') {
    logger.error('Cannot pause unless in ready state')
    return
  }
  await shutdown()
  await setImmediatePromise()
  setState('loaded')
}

/**
 * Scrub it clean!
 * Would allow redefining classes before calling start again, mostly for tests.
 */
export async function reset (): Promise<void> {
  if (getState() !== 'shutdown') await shutdown()
  unloadAdapters()
  unloadMiddleware()
  // unloadServer()
  await setImmediatePromise()
  setState('waiting')
}
