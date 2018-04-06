import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { config } from '../argv'
import * as adapter from './index'

class MockAdapter extends adapter.Adapter {
  name = 'mock-adapter'
  async start () {
    // mock start
  }
}
const mockAdapter = new MockAdapter()
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
      const test = adapter.loadAdapter('./lib/adapter/index.spec')
      expect(test).to.be.an.instanceof(adapter.Adapter)
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
      config.storageAdapter = './lib/adapter/index.spec'
      config.analyticsAdapter = './lib/adapter/index.spec'
      adapter.loadAdapters()
      sinon.assert.calledTwice(use)
    })
  })
  describe('.startAdapters', () => {
    it('starts all configured adapters', () => {
      config.languageAdapter = './lib/adapter/index.spec'
      config.webhookAdapter = './lib/adapter/index.spec'
      adapter.loadAdapters()
      adapter.startAdapters()
      sinon.assert.calledTwice(start)
    })
  })
})
