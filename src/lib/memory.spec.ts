import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { memory, user, settings, adapters, StorageAdapter } from '..'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let mockAdapter: StorageAdapter
class MockStorageAdapter extends StorageAdapter {
  name = 'mock-storage'
  async start () { return }
  async shutdown () { return }
  async saveMemory () { return }
  async loadMemory () { return }
  async keep () { return }
  async find () { return }
  async findOne () { return }
  async lose () { return }
}

describe('[memory]', () => {
  before(() => {
    mockAdapter = sinon.createStubInstance(MockStorageAdapter)
    settings.set('autoSave', false)
    sinon.spy(memory, 'setSaveInterval')
    sinon.spy(memory, 'clearSaveInterval');
    (mockAdapter.loadMemory as sinon.SinonStub).resolves({ test: { foo: 'bar' } });
    (mockAdapter.find as sinon.SinonStub).resolves([{ test: 'test' }]);
    (mockAdapter.findOne as sinon.SinonStub).resolves({ test: 'test' })
    adapters.storage = mockAdapter
  })
  afterEach(() => {
    (memory.setSaveInterval as sinon.SinonSpy).resetHistory();
    (memory.clearSaveInterval as sinon.SinonSpy).resetHistory()
  })
  after(() => {
    (memory.setSaveInterval as sinon.SinonSpy).restore();
    (memory.clearSaveInterval as sinon.SinonSpy).restore()
  })
  describe('Memory', () => {
    describe('.clear', () => {
      it('resets to initial memory collections', () => {
        memory.users = { 'foo': user.create({ id: 'foo' }) }
        memory.clear()
        expect(memory.toObject()).to.eql({ users: {}, private: {} })
      })
    })
    describe('.save', () => {
      it('stops and restarts the save interval', async () => {
        await memory.save()
        sinon.assert.calledOnce(memory.clearSaveInterval as sinon.SinonSpy)
        sinon.assert.calledOnce(memory.setSaveInterval as sinon.SinonSpy)
      })
    })
    describe('.load', () => {
      it('populates memory with data from storage adapter', async () => {
        await memory.load()
        expect(memory.toObject()).to.eql({
          users: {}, private: {}, test: { foo: 'bar' }
        })
      })
      it('merges existing key/value pairs with any loaded', async () => {
        memory.clear()
        memory.test = { baz: 'qux' }
        await memory.load()
        expect(memory.toObject()).to.eql({
          users: {}, private: {}, test: { foo: 'bar', baz: 'qux' }
        })
      })
    })
    describe('.setSaveInterval', () => {
      it('calls saveMemory after interval', async () => {
        const save = sinon.spy(memory, 'save')
        settings.set('autoSave', true)
        memory.setSaveInterval(20)
        await delay(50)
        sinon.assert.calledTwice(save)
        settings.set('autoSave', false)
        if (memory.intervals.save.timer) {
          global.clearInterval(memory.intervals.save.timer)
        }
        save.restore()
      })
    })
    describe('.clearSaveInterval', () => {
      it('stops saveMemory from calling', async () => {
        const save = sinon.spy(memory, 'save')
        settings.set('autoSave', true)
        memory.setSaveInterval(100)
        expect((memory.intervals.save.timer as any)._idleTimeout).to.equal(100)
        memory.clearSaveInterval()
        expect((memory.intervals.save.timer as any)._idleTimeout).to.equal(-1)
        sinon.assert.notCalled(save)
        settings.set('autoSave', false)
        save.restore()
      })
    })
    describe('.set', () => {
      it('adds key/value pair to memory in given collection', () => {
        memory.set('test-id', { test: 'test' }, 'tests')
        expect(memory.tests).to.eql({ 'test-id': { test: 'test' } })
      })
      it('updates existing value', () => {
        memory.set('tests', 1)
        memory.set('tests', 2)
        expect(memory.private.tests).to.equal(2)
      })
    })
    describe('.get', () => {
      it('retrieves data by key in memory collection', () => {
        memory.set('test-id', { test: 'test' }, 'tests')
        expect(memory.get('test-id', 'tests')).to.eql({ test: 'test' })
      })
    })
    describe('.unset', () => {
      it('removes data by key in memory collection', () => {
        memory.set('test-id', { test: 'test' }, 'tests')
        memory.unset('test-id', 'tests')
        expect(memory.tests).to.eql({})
      })
    })
    describe('.start', () => {
      afterEach(() => {
        if (memory.intervals.save.timer) {
          global.clearInterval(memory.intervals.save.timer)
        }
      })
      it('loads brain from store', async () => {
        memory.clear()
        await memory.start()
        expect(memory.toObject()).to.eql({
          users: {}, private: {}, test: { foo: 'bar' }
        })
      })
      it('starts timeout', async () => {
        memory.clear()
        await memory.start()
        sinon.assert.calledOnce(memory.setSaveInterval as sinon.SinonSpy)
        if (memory.intervals.save.timer) {
          global.clearInterval(memory.intervals.save.timer)
        }
      })
    })
    describe('.shutdown', () => {
      beforeEach(() => memory.shutdown())
      it('saves memory', async () => {
        const spy = sinon.spy(memory, 'save')
        await memory.shutdown()
        sinon.assert.calledOnce(spy)
        spy.restore()
      })
      it('clears save interval', async () => {
        await memory.shutdown()
        sinon.assert.called(memory.clearSaveInterval as sinon.SinonSpy)
      })
    })
  })
})
