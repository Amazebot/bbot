process.env.LOG_LEVEL = 'silent' // suppress bot logs

import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { EventEmitter } from 'events'
import * as bot from './bot'

describe('bot', () => {
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
