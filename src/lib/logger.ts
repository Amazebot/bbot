import * as winston from 'winston'
import * as bot from '..'

/**
 * Allows extensions to create new logs
 * @link https://github.com/winstonjs/winston/tree/2.x
 */
export class Logger extends winston.Logger {}

/**
 * Winston logger provides a logging interface common to many Node apps, with
 * custom levels, filters, and outputs, and service integrations.
 * It will also handle exceptions and exit after logging (except middleware).
 *
 * By default, all log items will write to console and a combined log file,
 * errors also write to a an error log file. Log level can be set globally or
 * for each transport:
 *
 * @example <caption>Suppress all bot error file logs</caption>
 *  import { logger } from 'bbot/logger'
 *  logger.level = 'silent'
 *  logger.transports.errors.level = 'error'
 *
 * @todo Update to Winston v3 when typings complete
 * https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20418
 * @todo Add filter to prevent logging passwords etc
 */
export const logger = new Logger({
  level: bot.config.logLevel,
  handleExceptions: true,
  exitOnError: (err) => ((err as any).middleware === undefined),
  transports: [
    new winston.transports.File({
      name: 'errors',
      filename: 'error.log',
      level: 'error',
      maxsize: 500000,
      timestamp: true,
      json: true
    }),
    new winston.transports.File({
      name: 'combined',
      filename: 'combined.log',
      level: 'debug',
      maxsize: 500000,
      timestamp: true,
      json: true
    }),
    new winston.transports.Console({
      name: 'console',
      prettyPrint: true,
      colorize: true,
      timestamp: true,
      humanReadableUnhandledException: true
    })
  ]
})
