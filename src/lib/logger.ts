import * as winston from 'winston'
const { combine, timestamp, json, colorize, align } = winston.format

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
 */
export const logger = winston.createLogger({
  level: process.env.BOT_LOG_LEVEL,
  exitOnError: (err: Error) => ((err as any).middleware === undefined),
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      maxsize: 500000,
      format: combine(timestamp(), json())
    }),
    new winston.transports.File({
      filename: 'combined.log',
      level: 'debug',
      maxsize: 500000,
      format: combine(timestamp(), json())
    }),
    new winston.transports.Console({
      format: combine(colorize(), align(), winston.format.printf((nfo: any) => {
        return `${nfo.level}: ${nfo.message}`
      }))
    })
  ]
})
