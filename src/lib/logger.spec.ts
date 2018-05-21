import { expect } from 'chai'
import * as winston from 'winston'
import { logger, Logger } from './logger'
const initLogLevel = logger.level
const throwNextTick = (err) => process.nextTick(() => { throw err })

describe('logger', () => {
  before(() => {
    logger.add(winston.transports.Memory, {
      json: true,
      level: 'debug'
    }) // log to internal array
  })
  after(() => {
    logger.level = initLogLevel
    logger.remove(winston.transports.Memory)
  })
  beforeEach(() => {
    (logger.transports.memory as any).clearLogs()
  })
  describe('transports', () => {
    it('has errors, combined and console log transports', () => {
      expect(logger.transports).to.include.keys('errors', 'combined', 'console')
    })
  })
  describe('.debug', () => {
    it('writes to the test logger', () => {
      const testErrors = (logger.transports.memory as any).errorOutput
      logger.debug('test debug log')
      expect(JSON.parse(testErrors[0]).message).to.equal('test debug log')
    })
  })
  /** @todo Fix testing log error handling - tricky to test uncaught in mocha */
  /*
  describe('.error', () => {
    it('exits after logging exception', () => {})
    it('does not exit from errors in middleware', () => {
      const testErrors = (logger.transports.memory as any).errorOutput
      const err: any = new Error('throw me')
      err.middleware = 'testing'
      throwNextTick(err)
      return process.nextTick(() => {
        expect(JSON.parse(testErrors[0]).message).to.equal('throw me')
      })
    })
  })
  */
})
