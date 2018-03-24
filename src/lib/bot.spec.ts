import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { EventEmitter } from 'events'
import { logger } from './logger'
import * as bot from './bot'
const initLogLevel = logger.level

describe('bot', () => {
  before(() => logger.level = 'silent')
  after(() => logger.level = initLogLevel)
  describe('.events', () => {
    it('exports an event emitter', () => {
      expect(bot.events).to.be.instanceof(EventEmitter)
    })
  })
  describe('.start', () => {
    it('returns a promise', () => {
      expect(bot.start().then).to.be.a('function')
    })
    it('emits ready event', async () => {
      const spy = sinon.spy()
      bot.events.on('ready', spy)
      await bot.start()
      expect(spy.calledOnce).to.equal(true)
    })
  })
})
