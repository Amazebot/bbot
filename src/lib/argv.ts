import * as yargs from 'yargs'
import * as packageJSON from '../../package.json'
import { IOptions } from '../config/botInterfaces'

/**
 * Used to trim argv into shape of interface
 * @todo Needs to be updated with changes to interface, should be dynamic
 */
export const optionsFilterKeys = [
  'logLevel',
  'name',
  'alias'
]

/**
 * Combine and load config from command line, environment and JSON if provided.
 */
export function getConfig () {
  const argv = yargs
    .usage('\nUsage: $0 [args]')
    .env('BOT')
    .pkgConf('bot')
    .option('log-level', {
      type: 'string',
      describe: 'The starting minimum level for logging events (silent|debug|info|warn|error).',
      default: 'info'
    })
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
  const config: any = []
  for (let key of Object.keys(argv)) {
    if (optionsFilterKeys.indexOf(key) !== -1) {
      config[key] = argv[key]
    }
  }
  return config
}

export const config = getConfig() as IOptions

if (process.platform !== 'win32') process.on('SIGTERM', () => process.exit(0))
