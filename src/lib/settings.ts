import 'dotenv/config'
import * as yargs from 'yargs'
import { packageJSON } from './json'

/** Load/reload/get/set config from command line args, files and in code. */
export namespace settings {
  /** Initial options, can be extended before and after load. */
  const initOptions: { [key: string]: yargs.Options } = {
    'name': {
      type: 'string',
      describe: 'Name of the bot in chat. Prepending any command with the name will trigger `direct` branches.',
      alias: 'n',
      default: 'bot'
    },
    'alias': {
      type: 'string',
      describe: 'Alternate name for the bot.'
    },
    'log-level': {
      type: 'string',
      describe: 'The starting minimum level for logging events (silent|debug|info|warn|error).',
      default: 'info'
    },
    'auto-save': {
      type: 'boolean',
      describe: 'Save data in the brain every 5 seconds (defaults true).',
      default: true
    },
    'use-server': {
      type: 'boolean',
      describe: 'Enable/disable the internal Koa server for incoming requests and http/s messages.',
      default: true
    },
    'server-host': {
      type: 'string',
      describe: 'The host the bot is running on.',
      default: 'localhost'
    },
    'server-port': {
      type: 'string',
      describe: 'The port the server should listen on.',
      default: '3000'
    },
    'server-secure': {
      type: 'boolean',
      describe: 'Server should listen on HTTPS only.',
      default: false
    },
    'message-adapter': {
      type: 'string',
      describe: 'Local path or NPM package name to require as message platform adapter',
      alias: 'm',
      default: './adapters/shell'
    },
    'nlu-adapter': {
      type: 'string',
      describe: 'Local path or NPM package name to require as message platform adapter',
      alias: 'l',
      default: null
    },
    'storage-adapter': {
      type: 'string',
      describe: 'Local path or NPM package name to require as storage engine adapter',
      alias: 's',
      default: null
    },
    'nlu-min-length': {
      type: 'number',
      describe: 'Minimum string length for NLU parsing to apply on message',
      default: 10
    },
    'request-timeout': {
      type: 'number',
      describe: 'Milliseconds to wait for a http/s request to resolve',
      default: 1500
    },
    'dialogue-timeout': {
      type: 'number',
      describe: 'Default milliseconds to wait for input in dialogue (0 = infinite)',
      default: 0
    },
    'dialogue-timeout-text': {
      type: 'string',
      describe: 'What to send when timeout reached, set null to not send',
      default: 'Sorry, the time limit for a response was reached. Please start again.'
    },
    'dialogue-timeout-method': {
      type: 'string',
      describe: 'The envelope method to use when dispatching message on timeout',
      default: 'send'
    }
  }

  /** Collection of yargs options, can be extended at runtime. */
  export let options = Object.assign({}, initOptions)

  /** Access all settings from argv, env, package and custom config files. */
  export let config: yargs.Arguments

  /** Keep all manually assigned configs, to be retained on reload. */
  export let updates: { [key: string]: any } = {}

  /** Write header for command line options. */
  export const argsInfo = `
  All option can be provided as environment variables, with the prefix \`BOT_\`.
  Config can also be declared in \`package.json\` with the key: "botConfig".
  For more information, see http://bbot.chat/docs/config'
    `

  /** Print errors in config (before logger loaded). */
  export const argsError = (msg: string, err: Error) => {
    console.error(msg, err)
    console.info('Start with --help for config argument info.')
    if (err) throw err
    process.exit(1)
  }

  /**
   * Combine and load config from command line, environment and JSON if provided.
   * The returned argv object will copy any options given using param alias into
   * the main attribute, or use defaults if none assigned. The option values are
   * then assigned to the config object (some are nullable).
   */
  export function load (clear = false) {
    const opts: { [key: string]: yargs.Options } = {} // populate new options
    for (let key in options) {
      const opt = Object.assign({}, options[key])
      if (config && typeof opt.global === 'undefined') opt.global = false
      opts[key] = opt
    }
    const loaded = yargs
      .options(opts)
      .usage('\nUsage: $0 [args]')
      .env('BOT')
      .pkgConf('bot')
      .config()
      .alias('config', 'c')
      .example('config', 'bin/bbot -c bot-config.json')
      .version(packageJSON.version)
      .alias('version', 'v')
      .help()
      .alias('h', 'help')
      .epilogue(argsInfo)
      .fail(argsError)
      .argv
    if (clear) updates = {} // reset later assigned settings on reload/reset
    else for (let key in updates) loaded[key] = updates[key]
    for (let key in loaded) {
      if (Object.keys(options).indexOf(hyphenate(key)) < 0) delete loaded[key]
    }
    config = Object.assign({}, loaded)
    return loaded
  }

  /** Reload config without taking on post load settings. */
  export function reset () {
    options = Object.assign({}, initOptions)
    load(true)
  }

  /** Validate name, stripping special characters */
  export const safeName = (name: string) => name.replace(/[^a-z0-9_-]/ig, '')

  /** Generic config getter */
  export const get = (key: string) => config[key]

  /** Generic config setter (@todo this is kinda whack) */
  export function set (key: string, value: any) {
    if (['name', 'alias'].includes(key)) value = safeName(value)
    config[key] = value
    updates[key] = value
    if (key === hyphenate(key)) {
      config[camelCase(key)] = value
      updates[camelCase(key)] = value
    } else if (key === camelCase(key)) {
      config[hyphenate(key)] = value
      updates[hyphenate(key)] = value
    }
  }

  /** Generic config clear */
  export function unset (key: string) {
    delete config[key]
    delete config[camelCase(key)]
    delete config[hyphenate(key)]
    delete updates[key]
    delete updates[camelCase(key)]
    delete updates[hyphenate(key)]
    load()
  }

  /** Add more options after load */
  export function extend (newOptions: { [key: string]: yargs.Options }) {
    options = Object.assign({}, options, newOptions)
    load()
  }

  /** Utility for converting option keys, from fooBar to foo-bar. */
  export function hyphenate (str: string) {
    return str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)
  }
  /** Utility for converting option keys, from foo-bar to fooBar */
  export function camelCase (str: string) {
    return str.replace(/-([a-z])/gi, (g) => g[1].toUpperCase())
  }
}

if (process.platform !== 'win32') process.on('SIGTERM', () => process.exit(0))
