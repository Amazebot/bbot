import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { config } from './argv'
import { Adapter } from './adapter-classes/base'
import * as adapter from './adapter'
import * as bot from '..'

class MockAdapter extends Adapter {
  name = 'mock-adapter'
  async start () { /* mock start */ }
}
const mockAdapter = new MockAdapter(bot)
const start = sinon.spy(mockAdapter, 'start')
export const use = sinon.spy(() => mockAdapter)

describe('adapter', () => {
  beforeEach(() => {
    delete config.messageAdapter
    delete config.languageAdapter
    delete config.storageAdapter
    delete config.webhookAdapter
    delete config.analyticsAdapter
  })
  afterEach(() => {
    use.resetHistory()
    start.resetHistory()
  })
  describe('.loadAdapter', () => {
    it('loads adapter exported at path', () => {
      const test = adapter.loadAdapter('./lib/adapter.spec')
      expect(test).to.be.an.instanceof(Adapter)
      sinon.assert.calledOnce(use)
    })
  })
  describe('.loadAdapters', () => {
    it('loads nothing if none configured', () => {
      expect(() => adapter.loadAdapters()).to.not.throw()
    })
    it('throws if bad path in config for adapter', () => {
      config.messageAdapter = 'foo',
      expect(() => adapter.loadAdapters()).to.throw()
    })
    it('loads all configured adapters at valid path', () => {
      config.storageAdapter = './lib/adapter.spec'
      config.analyticsAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      sinon.assert.calledTwice(use)
    })
    it('keeps loaded adapters in collection', () => {
      config.messageAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      expect(adapter.adapters.message).to.be.instanceof(Adapter)
      expect(adapter.adapters.language).to.equal(null)
    })
    it('can load shell adapter extending message adapter', () => {
      config.messageAdapter = './adapters/shell'
      adapter.loadAdapters()
    })
  })
  describe('.startAdapters', () => {
    it('starts all configured adapters', () => {
      config.languageAdapter = './lib/adapter.spec'
      config.webhookAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      adapter.startAdapters()
      sinon.assert.calledTwice(start)
    })
  })
  describe('.unloadAdapters', () => {
    it('clears all configured adapters', () => {
      config.languageAdapter = './lib/adapter.spec'
      config.webhookAdapter = './lib/adapter.spec'
      adapter.loadAdapters()
      adapter.unloadAdapters()
      expect(adapter.adapters).to.eql({})
    })
  })
})
