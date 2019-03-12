import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import config from '../util/config'
import adapters, { abstracts } from './adapter'
import bBot from '..'
import { ShellAdapter } from '../adapters/shell'
import * as mock from '../test/mock'

const stubs: { [key: string]: sinon.SinonStub } = {}

describe('[adapter]', () => {
  beforeEach(() => {
    for (let type of adapters.types) config.set(`${type}-adapter`, null)
    adapters.unloadAll()
    mock.use.resetHistory()
  })
  after(() => mock.use.resetHistory())
  describe('.isAdapter', () => {
    it('returns true for adapter instances', () => {
      expect(adapters.isAdapter(mock.adapter)).to.equal(true)
    })
    it('returns false if adapter instance not implemented properly', () => {
      expect(adapters.isAdapter({
        name: 'invalid-adapter',
        bot: bBot,
        start: Promise.resolve()
        // <-- missing .shutdown()
      })).to.equal(false)
    })
  })
  describe('.fromModule', () => {
    it('returns undefined if no module found', () => {
      const result = adapters.fromModule('not-a-module')
      expect(typeof result).to.equal('undefined')
    })
  })
  describe('.fromPath', () => {
    it('loads adapter exported at path', () => {
      const test = adapters.fromPath('./test/mock')
      expect(test.use(bBot)).to.be.an.instanceof(abstracts.Adapter)
    })
    it('loads internal adapters at path', () => {
      const test = adapters.fromPath('./adapters/shell')
      expect(test.use(bBot)).to.be.an.instanceof(ShellAdapter)
    })
  })
  describe('.load', () => {
    before(() => {
      stubs.fromModule = sinon.stub(adapters, 'fromModule' as any)
      stubs.fromPath = sinon.stub(adapters, 'fromPath' as any)
      stubs.fromModule.withArgs('good-name').returns({ use: mock.use })
      stubs.fromModule.withArgs('bad-name').returns(undefined)
      stubs.fromPath.returns({ use: mock.use })
    })
    beforeEach(() => {
      stubs.fromModule.resetHistory()
      stubs.fromPath.resetHistory()
    })
    after(() => {
      stubs.fromModule.restore()
      stubs.fromPath.restore()
    })
    it('loads from module if not given a path', () => {
      adapters.load('good-name')
      sinon.assert.calledOnce(stubs.fromModule)
    })
    it('does not attempt load from module if path given', () => {
      adapters.load('./path')
      sinon.assert.notCalled(stubs.fromModule)
    })
    it('attempts to load from path if path given', () => {
      adapters.load('./path')
      sinon.assert.calledOnce(stubs.fromPath)
    })
    it('attempts to use name as path if module loading fails', () => {
      adapters.load('bad-name')
      sinon.assert.calledOnce(stubs.fromModule)
      sinon.assert.calledWithMatch(stubs.fromPath, /\/bad-name/)
    })
  })
  describe('.loadAll', () => {
    it('loads nothing if none configured', () => {
      expect(() => adapters.loadAll()).to.not.throw()
    })
    it('throws if bad path in config for adapter', () => {
      config.set('message-adapter', 'foo')
      expect(() => adapters.loadAll()).to.throw()
    })
    it('loads all configured adapters at valid path', () => {
      config.set('message-adapter', './test/mock')
      config.set('storage-adapter', './test/mock')
      config.set('nlu-adapter', './test/mock')
      adapters.loadAll()
      sinon.assert.calledThrice(mock.use)
    })
    it('loads shell message adapter by default', () => {
      config.reset()
      adapters.loadAll()
      expect(adapters.loaded).to.have.property('message')
      expect(adapters.loaded.message!.name).to.equal('shell-message-adapter')
    })
    it('keeps loaded adapters in collection', () => {
      config.set('message-adapter', './test/mock')
      adapters.loadAll()
      expect(adapters.loaded.message).to.be.instanceof(abstracts.Adapter)
      expect(typeof adapters.loaded.nlu).to.equal('undefined')
    })
  })
  describe('.startAll', () => {
    beforeEach(() => {
      mock.adapters.reset()
      adapters.loaded.storage = mock.adapters.storage
      adapters.loaded.nlu = mock.adapters.nlu
    })
    it('starts all loaded adapters', async () => {
      await adapters.startAll()
      sinon.assert.calledOnce(adapters.loaded.storage!.start as sinon.SinonStub)
      sinon.assert.calledOnce(adapters.loaded.nlu!.start as sinon.SinonStub)
    })
  })
  describe('.shutdownAll', () => {
    beforeEach(() => {
      mock.adapters.reset()
      adapters.loaded.storage = mock.adapters.storage
      adapters.loaded.nlu = mock.adapters.nlu
    })
    it('shuts down all loaded adapters', async () => {
      await adapters.shutdownAll()
      sinon.assert.calledOnce(adapters.loaded.storage!.shutdown as sinon.SinonStub)
      sinon.assert.calledOnce(adapters.loaded.nlu!.shutdown as sinon.SinonStub)
    })
  })
  describe('.unloadAll', () => {
    it('clears all configured adapters', async () => {
      adapters.register('message', './test/mock')
      adapters.register('nlu', './test/mock')
      adapters.register('storage', './test/mock')
      adapters.unloadAll()
      expect(adapters.loaded).to.eql({})
    })
  })
})
