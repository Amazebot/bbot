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
  describe('.fromPath', () => {
    it('loads adapter exported at path', () => {
      const test = bot.adapter.fromPath('./lib/adapter.spec')
      expect(test).to.be.an.instanceof(bot.Adapter)
      sinon.assert.calledOnce(use)
    })
  })
  describe('Adapters', () => {
    describe('.loadAll', () => {
      it('loads nothing if none configured', () => {
        expect(() => bot.adapter.loadAll()).to.not.throw()
      })
      it('throws if bad path in config for adapter', () => {
        bot.settings.set('messageAdapter', 'foo'),
        expect(() => bot.adapter.loadAll()).to.throw()
      })
      it('loads all configured adapters at valid path', () => {
        bot.settings.set('storageAdapter', './lib/adapter.spec')
        bot.settings.set('nluAdapter', './lib/adapter.spec')
        bot.adapter.loadAll()
        sinon.assert.calledTwice(use)
      })
      it('keeps loaded adapters in collection', () => {
        bot.settings.set('messageAdapter', './lib/adapter.spec')
        bot.adapter.loadAll()
        expect(bot.adapter.adapters.message).to.be.instanceof(bot.Adapter)
        expect(typeof bot.adapter.adapters.nlu).to.equal('undefined')
      })
    })
    describe('.startAll', () => {
      it('starts all loaded adapters', async () => {
        bot.adapter.adapters.storage = new MockAdapter(bot)
        bot.adapter.adapters.nlu = new MockAdapter(bot)
        const startStorage = sinon.spy(bot.adapter.adapters.storage, 'start')
        const startNLU = sinon.spy(bot.adapter.adapters.nlu, 'start')
        await bot.adapter.startAll()
        sinon.assert.calledOnce(startStorage)
        sinon.assert.calledOnce(startNLU)
      })
    })
    describe('.shutdownAll', () => {
      it('shuts down all loaded adapters', async () => {
        bot.adapter.adapters.storage = new MockAdapter(bot)
        bot.adapter.adapters.nlu = new MockAdapter(bot)
        const shutdownStorage = sinon.spy(bot.adapter.adapters.storage, 'shutdown')
        const shutdownNLU = sinon.spy(bot.adapter.adapters.nlu, 'shutdown')
        await bot.adapter.shutdownAll()
        sinon.assert.calledOnce(shutdownStorage)
        sinon.assert.calledOnce(shutdownNLU)
      })
    })
    describe('.unloadAll', () => {
      it('clears all configured adapters', async () => {
        bot.adapter.register('message', './lib/adapter.spec')
        bot.adapter.register('nlu', './lib/adapter.spec')
        bot.adapter.register('storage', './lib/adapter.spec')
        bot.adapter.unloadAll()
        expect(bot.adapter.adapters).to.eql({})
      })
    })
  })
})
