import 'dotenv/config'
import * as yargs from 'yargs'
import { packageJSON } from './json'

/** Initial array of config options, can be extended prior to load. */
export const options: { [key: string]: yargs.Options } = {
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
  'webhook-adapter': {
    type: 'string',
    describe: 'Local path or NPM package name to require as webhook provider adapter',
    alias: 'w',
    default: null
  },
  'analytics-adapter': {
    type: 'string',
    describe: 'Local path or NPM package name to require as analytics provider adapter',
    alias: 'a',
    default: null
  }
}

/**
 * Combine and load config from command line, environment and JSON if provided.
 * The returned argv object will copy any options given using param alias into
 * the main attribute, or use defaults if none assigned. The option values are
 * then assigned to the config object (some are nullable).
 */
export function getConfig () {
  for (let key in options) yargs.option(key, options[key])
  return yargs
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
    .epilogue(
`All option can be provided as environment variables, with the prefix \`BOT_\`.
Config can also be declared in \`package.json\` with the key: "botConfig".
For more information, see https://amazebot.github.io/bbot'`
    )
    .fail((msg: string, err: Error) => {
      console.error(msg, err)
      console.info('Start with --help for config argument info.')
      if (err) throw err
      process.exit(1)
    })
    .argv
}

/** Access all settings from argv, env, package.json and custom config file */
export const config = getConfig()

/** Make some configs available at module root */
export let name = config.name
export let alias = config.alias

if (process.platform !== 'win32') process.on('SIGTERM', () => process.exit(0))
