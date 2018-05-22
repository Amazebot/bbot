import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

describe('bot', () => {
  afterEach(() => bot.reset())
  describe('.load', () => {
    it('returns a promise', () => {
      const loading = bot.load()
      expect(loading.then).to.be.a('function')
      return loading
    })
    it('loads middleware', async () => {
      await bot.load()
      expect(Object.keys(bot.middlewares)).have.length.gt(0)
    })
    it('loads adapters', async () => {
      const bot = require('..')
      await bot.load()
      expect(Object.keys(bot.adapters)).have.length.gt(0)
    })
  })
  describe('.start', () => {
    it('returns a promise', () => {
      expect(bot.start().then).to.be.a('function')
    })
    it('emits ready event', async () => {
      const spy = sinon.spy()
      bot.events.on('started', spy)
      await bot.start()
      expect(spy.calledOnce).to.equal(true)
    })
  })
  describe('.shutdown', () => {
    it('returns a promise', () => {
      const shutdown = bot.shutdown()
      expect(shutdown.then).to.be.a('function')
      return shutdown
    })
    // nothing to test yet
  })
  describe('.pause', () => {
    it('returns a promise', () => {
      const pause = bot.pause()
      expect(pause.then).to.be.a('function')
      return pause
    })
    // nothing to test yet
  })
  describe('.reset', () => {
    it('returns a promise', () => {
      const reset = bot.reset()
      expect(reset.then).to.be.a('function')
      return reset
    })
    it('clears middleware', async () => {
      await bot.start()
      await bot.reset()
      expect(Object.keys(bot.middlewares)).to.have.lengthOf(0)
    })
    it('clears adapters', async () => {
      await bot.start()
      await bot.reset()
      expect(Object.keys(bot.adapters)).to.have.lengthOf(0)
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
