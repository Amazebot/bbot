import { Config } from '@amazebot/config'

export const config = new Config({
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
}, 'BOT')

config.load()

export default config
