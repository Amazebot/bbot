import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { logger } from './logger'
import { events } from './events'
import { adapters } from './adapter'
import { middlewares } from './middleware'
import * as bot from './bot'

describe('bot', () => {
  afterEach(() => bot.reset())
  describe('.load', () => {
    it('returns a promise', () => {
      expect(bot.load().then).to.be.a('function')
    })
    it('loads middleware', async () => {
      await bot.load()
      expect(Object.keys(middlewares)).have.length.gt(0)
    })
    it('loads adapters', async () => {
      await bot.load()
      expect(Object.keys(adapters)).have.length.gt(0)
    })
  })
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
  describe('.shutdown', () => {
    it('returns a promise', () => {
      expect(bot.shutdown().then).to.be.a('function')
    })
    // nothing to test yet
  })
  describe('.pause', () => {
    it('returns a promise', () => {
      expect(bot.pause().then).to.be.a('function')
    })
    // nothing to test yet
  })
  describe('.reset', () => {
    it('returns a pause', () => {
      expect(bot.reset().then).to.be.a('function')
    })
    it('clears middleware', async () => {
      await bot.start()
      await bot.reset()
      expect(Object.keys(middlewares)).to.have.lengthOf(0)
    })
    it('clears adapters', async () => {
      await bot.start()
      await bot.reset()
      expect(Object.keys(adapters)).to.have.lengthOf(0)
    })
  })
  describe('.getState', () => {
    it('returns waiting before start', () => {
      expect(bot.getState()).to.equal('waiting')
    })
    it('returns loading then loaded on load', async () => {
      const loading = bot.load()
      expect(bot.getState()).to.equal('loading')
      await loading
      expect(bot.getState()).to.equal('loaded')
    })
    it('returns starting then ready on start', async () => {
      await bot.load()
      const starting = bot.start()
      expect(bot.getState()).to.equal('starting')
      await starting
      expect(bot.getState()).to.equal('ready')
    })
  })
})
