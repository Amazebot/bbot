import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '.'
import { EventEmitter } from 'events'
EventEmitter.prototype.setMaxListeners(100)

let initEnv: any

class MessageAdapter extends bot.adapter.Message {
  name = 'mock-adapter'
  async start () { /* mock start */ }
  async shutdown () { /* mock shutdown */ }
  async dispatch () { /* mock dispatch */ }
}
export const use = sinon.spy(() => new MessageAdapter(bot)) // use spec as module

describe('[core]', () => {
  before(() => {
    initEnv = process.env
    process.env.BOT_MESSAGE_ADAPTER = './lib/core.spec'
  })
  after(() => process.env = initEnv)
  describe('.load', () => {
    it('loads middleware', async () => {
      await bot.load()
      expect(Object.keys(bot.middleware.stacks)).have.length.gt(0)
    })
    it('loads adapters', async () => {
      await bot.load()
      expect(Object.keys(bot.adapter.adapters)).have.length.gt(0)
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
      expect(Object.keys(bot.middleware.stacks)).to.have.lengthOf(0)
    })
    it('clears adapters', async () => {
      await bot.start()
      await bot.reset()
      expect(Object.keys(bot.adapter.adapters)).to.have.lengthOf(0)
    })
    it('returns bot to waiting state', async () => {
      await bot.start()
      await bot.reset()
      expect(bot.getStatus()).to.equal('waiting')
    })
  })
  describe('.getStatus', () => {
    beforeEach(() => bot.reset())
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
