import { promisify } from 'util'
import * as bot from '..'

/** Await helper, pauses for event loop */
export const eventDelay = promisify(setImmediate)

/** Internal index for loading status */
const status: { [key: string]: 0 | 1 } = {
  waiting: 1, loading: 0, loaded: 0, starting: 0, started: 0, shutdown: 0
}

/** Private helper for setting and logging loading status. */
function setStatus (set: 'waiting' | 'loading' | 'loaded' | 'starting' | 'started' | 'shutdown') {
  for (let key of Object.keys(status)) status[key] = (set === key) ? 1 : 0
  if (set === 'loading') {
    bot.logger.info(`[core] ${bot.name} loading  . . . . . ~(0_0)~`)
  } else if (set === 'starting') {
    bot.logger.info(`[core] ${bot.name} starting . . . . . ┌(O_O)┘ bzzzt whirr`)
  } else if (set === 'started') {
    bot.logger.info(`[core] ${bot.name} started  . . . . . ~(O_O)~ bleep bloop`)
  }
}

/** Find out where the loading or shutdown process is at. */
export function getStatus (): string {
  for (let key of Object.keys(status)) if (status[key] === 1) return key
  return 'broken' // should never get here
}

/**
 * Load all components.
 * Extensions/adapters can interrupt or modify the stack before start.
 */
export async function load (): Promise<void> {
  bot.logger.level = bot.config.logLevel // in case config changed after init
  if (getStatus() !== 'waiting') await reset()
  setStatus('loading')
  bot.logger.debug('[core] using config:', bot.config)
  bot.loadMiddleware()
  bot.loadAdapters()
  // loadServer()
  await eventDelay()
  setStatus('loaded')
  bot.events.emit('loaded')
}

/**
 * Make it go!
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.start()
 */
export async function start (): Promise<void> {
  if (getStatus() !== 'loaded') await load()
  setStatus('starting')
  await bot.startAdapters()
  // await startSever()
  await eventDelay()
  setStatus('started')
  bot.events.emit('started')
}

/**
 * Make it stop!
 * Stops responding but keeps history and loaded components.
 * Will wait until started if shutdown called while starting.
 * @example
 *  import * as bbot from 'bbot'
 *  bbot.shutdown()
 */
export async function shutdown (): Promise<void> {
  const status = getStatus()
  if (status === 'shutdown') return
  if (status === 'loading') {
    await new Promise((resolve) => bot.events.on('loaded', () => resolve()))
  } else if (status === 'starting') {
    await new Promise((resolve) => bot.events.on('started', () => resolve()))
  }
  await bot.shutdownAdapters()
  // shutdown server
  // stop thought process
  await eventDelay()
  setStatus('shutdown')
  bot.events.emit('shutdown')
}

/**
 * Stop temporarily.
 * Allow start to be called again without reloading
 */
export async function pause (): Promise<void> {
  await shutdown()
  await eventDelay()
  setStatus('loaded')
  bot.events.emit('paused')
}

/**
 * Scrub it clean!
 * Would allow redefining classes before calling start again, mostly for tests.
 */
export async function reset (): Promise<void> {
  const status = getStatus()
  if (status === 'waiting') return
  if (status !== 'shutdown') await shutdown()
  bot.unloadAdapters()
  bot.unloadMiddleware()
  bot.unloadListeners()
  // unloadServer()
  await eventDelay()
  setStatus('waiting')
  bot.events.emit('waiting')
}
