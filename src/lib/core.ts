import { promisify } from 'util'
import {
  settings,
  logger,
  middleware,
  server,
  memory,
  adapter,
  events,
  global
} from '.'

/** Await helper, pauses for event loop */
const eventDelay = promisify(setImmediate)

/** Internal index for loading status */
const status: { [key: string]: 0 | 1 } = {
  waiting: 1, loading: 0, loaded: 0, starting: 0, started: 0, shutdown: 0
}

/** Private helper for setting and logging loading status. */
function setStatus (set: 'waiting' | 'loading' | 'loaded' | 'starting' | 'started' | 'shutdown') {
  for (let key of Object.keys(status)) status[key] = (set === key) ? 1 : 0
  if (set === 'loading') {
    logger.info(`[core] ${settings.get('name')} loading  . . . . . ~(0_0)~`)
  } else if (set === 'starting') {
    logger.info(`[core] ${settings.get('name')} starting . . . . . ┌(O_O)┘ bzzzt whirr`)
  } else if (set === 'started') {
    logger.info(`[core] ${settings.get('name')} started  . . . . . ~(O_O)~ bleep bloop`)
  }
}

/** Find out where the loading or shutdown process is at. */
export function getStatus () {
  for (let key of Object.keys(status)) if (status[key] === 1) return key
  return 'broken' // should never get here
}

/**
 * Load all components.
 * Extensions/adapters can interrupt or modify the stack before start.
 */
export async function load () {
  logger.level = settings.get('log-level') // may change after init
  if (getStatus() !== 'waiting') await reset()
  setStatus('loading')
  try {
    middleware.loadAll()
    server.load()
    adapter.loadAll()
    await eventDelay()
    setStatus('loaded')
    events.emit('loaded')
  } catch (err) {
    logger.error('[core] failed to load')
    await shutdown(1).catch()
  }
}

/**
 * Make it go!
 * @example
 *  import * as bot from 'bbot'
 *  start()
 */
export async function start () {
  if (getStatus() !== 'loaded') await load()
  setStatus('starting')
  try {
    await server.start()
    await adapter.startAll()
    await memory.start()
  } catch (err) {
    logger.error('[core] failed to start')
    await shutdown(1).catch()
  }
  await eventDelay()
  setStatus('started')
  events.emit('started')
}

/**
 * Make it stop!
 * Stops responding but keeps history and loaded components.
 * Will wait until started if shutdown called while starting.
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.shutdown()
 */
export async function shutdown (exit = 0) {
  const status = getStatus()
  if (status === 'shutdown') return
  if (status === 'loading') {
    await new Promise((resolve) => events.on('loaded', () => resolve()))
  } else if (status === 'starting') {
    await new Promise((resolve) => events.on('started', () => resolve()))
  }
  await memory.shutdown()
  await adapter.shutdownAll()
  await server.shutdown()
  await eventDelay()
  setStatus('shutdown')
  events.emit('shutdown')
  if (exit) process.exit(exit)
}

/**
 * Stop temporarily.
 * Allow start to be called again without reloading
 */
export async function pause () {
  await shutdown()
  await eventDelay()
  setStatus('loaded')
  events.emit('paused')
}

/**
 * Scrub it clean!
 * Would allow redefining classes before calling start again, mostly for tests.
 */
export async function reset () {
  const status = getStatus()
  if (status !== 'shutdown') await shutdown()
  try {
    adapter.unloadAll()
    middleware.unloadAll()
    global.reset()
    settings.reset()
  } catch (err) {
    logger.error('[core] failed to reset')
    await shutdown(1).catch()
  }
  await eventDelay()
  setStatus('waiting')
  events.emit('waiting')
}
