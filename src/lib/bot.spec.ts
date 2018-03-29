import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { logger } from './logger'
import { events } from './events'
import * as bot from './bot'

describe('bot', () => {
  describe('.start', () => {
    it('returns a promise', () => {
      expect(bot.start().then).to.be.a('function')
    })
    it('emits ready event', async () => {
      const spy = sinon.spy()
      events.on('ready', spy)
      await bot.start()
      expect(spy.calledOnce).to.equal(true)
    })
  })
})
