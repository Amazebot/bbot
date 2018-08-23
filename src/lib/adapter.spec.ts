import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

/** Mock Adapter class has methods to imitate all different types */
class MockAdapter extends bot.Adapter {
  name = 'mock-adapter'
  async start () { /* mock start */ }
  async shutdown () { /* mock shutdown */ }
  async findOne () { /* mock findOne */ }
  async find () { /* mock find */ }
  async keep () { /* mock keep */ }
  async lose () { /* mock lose */ }
  async loadMemory () { /* mock loadMemory */ }
  async saveMemory () { /* mock saveMemory */ }
  async process () { return {} }
}
export const use = sinon.spy(() => new MockAdapter(bot)) // use spec as module

describe('[adapter]', () => {
  beforeEach(() => bot.reset())
  afterEach(() => use.resetHistory())
  describe('.loadAdapter', () => {
    it('loads adapter exported at path', () => {
      const test = bot.loadAdapter('./lib/adapter.spec')
      expect(test).to.be.an.instanceof(bot.Adapter)
      sinon.assert.calledOnce(use)
    })
  })
  describe('Adapters', () => {
    describe('.load', () => {
      it('loads nothing if none configured', () => {
        expect(() => bot.adapters.load()).to.not.throw()
      })
      it('throws if bad path in config for adapter', () => {
        bot.settings.set('messageAdapter', 'foo'),
        expect(() => bot.adapters.load()).to.throw()
      })
      it('loads all configured adapters at valid path', () => {
        bot.settings.set('storageAdapter', './lib/adapter.spec')
        bot.settings.set('nluAdapter', './lib/adapter.spec')
        bot.adapters.load()
        sinon.assert.calledTwice(use)
      })
      it('keeps loaded adapters in collection', () => {
        bot.settings.set('messageAdapter', './lib/adapter.spec')
        bot.adapters.load()
        expect(bot.adapters.message).to.be.instanceof(bot.Adapter)
        expect(typeof bot.adapters.nlu).to.equal('undefined')
      })
    })
    describe('.start', () => {
      it('starts all loaded adapters', async () => {
        bot.adapters.storage = new MockAdapter(bot)
        bot.adapters.nlu = new MockAdapter(bot)
        const startStorage = sinon.spy(bot.adapters.storage, 'start')
        const startNLU = sinon.spy(bot.adapters.nlu, 'start')
        await bot.adapters.start()
        sinon.assert.calledOnce(startStorage)
        sinon.assert.calledOnce(startNLU)
      })
    })
    describe('.shutdown', () => {
      it('shuts down all loaded adapters', async () => {
        bot.adapters.storage = new MockAdapter(bot)
        bot.adapters.nlu = new MockAdapter(bot)
        const shutdownStorage = sinon.spy(bot.adapters.storage, 'shutdown')
        const shutdownNLU = sinon.spy(bot.adapters.nlu, 'shutdown')
        await bot.adapters.shutdown()
        sinon.assert.calledOnce(shutdownStorage)
        sinon.assert.calledOnce(shutdownNLU)
      })
    })
    describe('.unload', () => {
      it('clears all configured adapters', async () => {
        bot.adapters.message = bot.loadAdapter('./lib/adapter.spec')
        bot.adapters.nlu = bot.loadAdapter('./lib/adapter.spec')
        bot.adapters.storage = bot.loadAdapter('./lib/adapter.spec')
        bot.adapters.unload()
        expect(bot.adapters).to.eql({})
      })
    })
  })
})
