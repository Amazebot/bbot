import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'
import * as adapter from './adapter'

let mockAdapter: bot.Adapter
let start: sinon.SinonSpy
export const use = sinon.spy(() => mockAdapter) // allows spec to run as module
class MockAdapter extends bot.Adapter {
  name = 'mock-adapter'
  async start () { /* mock start */ }
  async shutdown () { /* mock shutdown */ }
  async dispatch () { /* mock dispatch */ }
}

describe('[adapter]', () => {
  before(() => {
    mockAdapter = new MockAdapter(bot)
    start = sinon.spy(mockAdapter, 'start')
  })
  afterEach(() => {
    for (let key in adapter.adapters) delete adapter.adapters[key]
    delete bot.config.messageAdapter
    delete bot.config.languageAdapter
    delete bot.config.storageAdapter
    delete bot.config.webhookAdapter
    delete bot.config.analyticsAdapter
    use.resetHistory()
    start.resetHistory()
  })
  describe('.loadAdapter', () => {
    it('loads adapter exported at path', () => {
      const test = adapter.loadAdapter('./lib/adapter.spec')
      expect(test).to.be.an.instanceof(bot.Adapter)
      sinon.assert.calledOnce(use)
    })
  })
  describe('.loadAdapters', () => {
    it('loads nothing if none configured', () => {
      expect(() => adapter.loadAdapters()).to.not.throw()
    })
    it('throws if bad path in config for adapter', () => {
      bot.config.messageAdapter = 'foo',
      expect(() => adapter.loadAdapters()).to.throw()
    })
    it('loads all configured adapters at valid path', () => {
      bot.config.storageAdapter = './lib/adapter.spec'
      bot.config.analyticsAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      sinon.assert.calledTwice(use)
    })
    it('keeps loaded adapters in collection', () => {
      bot.config.messageAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      expect(adapter.adapters.message).to.be.instanceof(bot.Adapter)
      expect(typeof adapter.adapters.language).to.equal('undefined')
    })
    it('can load shell adapter extending message adapter', () => {
      bot.config.messageAdapter = './adapters/shell'
      adapter.loadAdapters()
    })
  })
  describe('.startAdapters', () => {
    it('starts all configured adapters', async () => {
      bot.config.languageAdapter = './lib/adapter.spec'
      bot.config.webhookAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      await adapter.startAdapters()
      sinon.assert.calledTwice(start)
    })
  })
  describe('.unloadAdapters', () => {
    it('clears all configured adapters', async () => {
      bot.config.languageAdapter = './lib/adapter.spec'
      bot.config.webhookAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      adapter.unloadAdapters()
      expect(adapter.adapters).to.eql({})
    })
  })
})
