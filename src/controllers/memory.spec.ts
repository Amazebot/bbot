import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

class MockStorageAdapter extends bot.adapter.Storage {
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
let mockStorage = sinon.createStubInstance(MockStorageAdapter)

describe('[memory]', () => {
  before(() => {
    bot.config.set('autoSave', false)
    bot.memory.setSaveInterval = sinon.spy()
    bot.memory.clearSaveInterval = sinon.spy()
    mockStorage.loadMemory.resolves({ test: { foo: 'bar' } })
    mockStorage.find.resolves([{ test: 'test' }])
    mockStorage.findOne.resolves({ test: 'test' })
    bot.adapter.adapters.storage = mockStorage
  })
  afterEach(() => {
    (bot.memory.setSaveInterval as sinon.SinonSpy).resetHistory();
    (bot.memory.clearSaveInterval as sinon.SinonSpy).resetHistory()
  })
  after(() => {
    (bot.memory.setSaveInterval as sinon.SinonSpy).restore();
    (bot.memory.clearSaveInterval as sinon.SinonSpy).restore()
  })
  describe('Memory', () => {
    describe('.clear', () => {
      it('resets to initial memory collections', () => {
        bot.memory.users = { 'foo': bot.user.create({ id: 'foo' }) }
        bot.memory.clear()
        expect(bot.memory.toObject()).to.eql({ users: {}, private: {} })
      })
    })
    describe('.save', () => {
      it('stops and restarts the save interval', async () => {
        await bot.memory.save()
        sinon.assert.calledOnce(bot.memory.clearSaveInterval as sinon.SinonSpy)
        sinon.assert.calledOnce(bot.memory.setSaveInterval as sinon.SinonSpy)
      })
    })
    describe('.load', () => {
      it('populates memory with data from storage adapter', async () => {
        await bot.memory.load()
        expect(bot.memory.toObject()).to.eql({
          users: {}, private: {}, test: { foo: 'bar' }
        })
      })
      it('merges existing key/value pairs with any loaded', async () => {
        bot.memory.clear()
        bot.memory.test = { baz: 'qux' }
        await bot.memory.load()
        expect(bot.memory.toObject()).to.eql({
          users: {}, private: {}, test: { foo: 'bar', baz: 'qux' }
        })
      })
    })
    describe('.setSaveInterval', () => {
      it('calls saveMemory after interval', async () => {
        const save = sinon.spy(bot.memory, 'save')
        bot.config.set('autoSave', true)
        bot.memory.setSaveInterval(20)
        await delay(50)
        sinon.assert.calledTwice(save)
        bot.config.set('autoSave', false)
        if (bot.memory.intervals.save.timer) {
          global.clearInterval(bot.memory.intervals.save.timer)
        }
        save.restore()
      })
    })
    describe('.clearSaveInterval', () => {
      it('stops saveMemory from calling', async () => {
        const save = sinon.spy(bot.memory, 'save')
        bot.config.set('autoSave', true)
        bot.memory.setSaveInterval(100)
        expect((bot.memory.intervals.save.timer as any)._idleTimeout).to.equal(100)
        bot.memory.clearSaveInterval()
        expect((bot.memory.intervals.save.timer as any)._idleTimeout).to.equal(-1)
        sinon.assert.notCalled(save)
        bot.config.set('autoSave', false)
        save.restore()
      })
    })
    describe('.set', () => {
      it('adds key/value pair to memory in given collection', () => {
        bot.memory.set('test-id', { test: 'test' }, 'tests')
        expect(bot.memory.tests).to.eql({ 'test-id': { test: 'test' } })
      })
      it('updates existing value', () => {
        bot.memory.set('tests', 1)
        bot.memory.set('tests', 2)
        expect(bot.memory.private.tests).to.equal(2)
      })
    })
    describe('.get', () => {
      it('retrieves data by key in memory collection', () => {
        bot.memory.set('test-id', { test: 'test' }, 'tests')
        expect(bot.memory.get('test-id', 'tests')).to.eql({ test: 'test' })
      })
    })
    describe('.unset', () => {
      it('removes data by key in memory collection', () => {
        bot.memory.set('test-id', { test: 'test' }, 'tests')
        bot.memory.unset('test-id', 'tests')
        expect(bot.memory.tests).to.eql({})
      })
    })
    describe('.start', () => {
      afterEach(() => {
        if (bot.memory.intervals.save.timer) {
          global.clearInterval(bot.memory.intervals.save.timer)
        }
      })
      it('loads brain from store', async () => {
        bot.memory.clear()
        await bot.memory.start()
        expect(bot.memory.toObject()).to.eql({
          users: {}, private: {}, test: { foo: 'bar' }
        })
      })
      it('starts timeout', async () => {
        bot.memory.clear()
        await bot.memory.start()
        sinon.assert.calledOnce(bot.memory.setSaveInterval as sinon.SinonSpy)
        if (bot.memory.intervals.save.timer) {
          global.clearInterval(bot.memory.intervals.save.timer)
        }
      })
    })
    describe('.shutdown', () => {
      beforeEach(() => bot.memory.shutdown())
      it('saves memory', async () => {
        const spy = sinon.spy(bot.memory, 'save')
        await bot.memory.shutdown()
        sinon.assert.calledOnce(spy)
        spy.restore()
      })
      it('clears save interval', async () => {
        await bot.memory.shutdown()
        sinon.assert.called(bot.memory.clearSaveInterval as sinon.SinonSpy)
      })
    })
  })
})
