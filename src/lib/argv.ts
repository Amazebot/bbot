/** @module argv */

import * as yargs from 'yargs'
import * as packageJSON from '../../package.json'

export interface IConfig {
  name: string,
  alias?: string,
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent',
  messageAdapter?: string,
  languageAdapter?: string,
  storageAdapter?: string,
  webhookAdapter?: string,
  analyticsAdapter?: string
}

/**
 * Combine and load config from command line, environment and JSON if provided.
 * The returned argv object will copy any options given using param alias into
 * the main attribute, or use defaults if none assigned. The option values are
 * then assigned to the config object (some are nullable).
 */
export function getConfig (): IConfig {
  const argv = yargs
    .usage('\nUsage: $0 [args]')
    .env('BOT')
    .pkgConf('bot')
    .option('name', {
      alias: 'n',
      type: 'string',
      describe: 'Name of the bot in chat. Prepending any command with the name will trigger respond listeners.\n',
      default: 'bot'
    })
    .option('alias', {
      type: 'string',
      describe: 'Alternate name for the bot.\n',
      default: false
    })
    .option('log-level', {
      type: 'string',
      describe: 'The starting minimum level for logging events (silent|debug|info|warn|error).',
      default: 'info'
    })
    .option('message-adapter', {
      type: 'string',
      describe: 'Local path or NPM package name to require as message platform adapter',
      alias: 'm',
      default: './adapters/shell'
    })
    .option('language-adapter', {
      type: 'string',
      describe: 'Local path or NPM package name to require as message platform adapter',
      alias: 'l',
      default: null
    })
    .option('storage-adapter', {
      type: 'string',
      describe: 'Local path or NPM package name to require as storage engine adapter',
      alias: 's',
      default: null
    })
    .option('webhook-adapter', {
      type: 'string',
      describe: 'Local path or NPM package name to require as webhook provider adapter',
      alias: 'w',
      default: null
    })
    .option('analytics-adapter', {
      type: 'string',
      describe: 'Local path or NPM package name to require as analytics provider adapter',
      alias: 'a',
      default: null
    })
    .config()
    .alias('config', 'c')
    .example('config', 'bin/bbot -c bot-config.json')
    .version(packageJSON.version)
    .alias('version', 'v')
    .help()
    .alias('help', 'h')
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
  const config: IConfig = {
    name: argv.name,
    alias: argv.alias,
    logLevel: argv.logLevel,
    messageAdapter: argv.messageAdapter,
    languageAdapter: argv.languageAdapter,
    storageAdapter: argv.storageAdapter,
    webhookAdapter: argv.webhookAdapter,
    analyticsAdapter: argv.analyticsAdapter
  }
  return config
}

export const config = getConfig()

if (process.platform !== 'win32') process.on('SIGTERM', () => process.exit(0))
