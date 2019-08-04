import 'mocha'
import { expect } from 'chai'
import * as sinon from 'sinon'

import { Bot } from './bot'
let bot: Bot

import * as mock from './test/mock'

describe('[bot]', () => {
  beforeEach(() => {
    bot = new Bot()
    mock.adapters.reset()
    bot.adapter.slots.message = mock.adapters.message
  })
  describe('constructor', () => {
    it('accepts options overriding default config', () => {
      const brocket = new Bot({ 'message-adapter': 'bbot-testing' })
      expect(brocket.config.get('message-adapter')).to.equal('bbot-testing')
    })
  })
  describe('.load', () => {
    it('loads middleware', async () => {
      await bot.load()
      expect(Object.keys(bot.middlewares.stacks)).have.length.gt(0)
    })
    it('loads adapters', async () => {
      await bot.load()
      expect(Object.keys(bot.adapter.slots)).have.length.gt(0)
    })
  })
  describe('.start', () => {
    it('emits ready event', async () => {
      const spy = sinon.spy()
      bot.events.on('started', spy)
      await bot.start()
      expect(spy.calledOnce).to.equal(true)
    })
  })
  describe('.reset', () => {
    it('clears middleware', async () => {
      await bot.start()
      await bot.reset()
      expect(Object.keys(bot.middlewares.stacks)).to.have.lengthOf(0)
    })
    it('clears adapters', async () => {
      await bot.start()
      await bot.reset()
      expect(Object.keys(bot.adapter.slots)).to.have.lengthOf(0)
    })
    it('returns bot to waiting state', async () => {
      await bot.start()
      await bot.reset()
      expect(bot.getStatus()).to.equal('waiting')
    })
  })
  describe('.getStatus', () => {
    it('returns waiting before start', () => {
      expect(bot.getStatus()).to.equal('waiting')
    })
    it('returns loading then loaded on load', async () => {
      const loading = bot.load()
      expect(bot.getStatus()).to.equal('loading')
      await loading
      expect(bot.getStatus()).to.equal('loaded')
    })
    it('returns starting then ready on start', async () => {
      await bot.load()
      const starting = bot.start()
      expect(bot.getStatus()).to.equal('starting')
      await starting
      expect(bot.getStatus()).to.equal('started')
    })
  })
})
