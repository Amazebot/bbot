import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
let mockAdapter: bot.StorageAdapter
const mockUsers = {
  'u1': new bot.User({ id: 'u1', name: 'test-1' }),
  'u2': new bot.User({ id: 'u2', name: 'test-2' })
}
class MockStorageAdapter extends bot.StorageAdapter {
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
    mockAdapter = sinon.createStubInstance(MockStorageAdapter);
    (mockAdapter.loadMemory as sinon.SinonStub).resolves({ test: { foo: 'bar' } });
    (mockAdapter.find as sinon.SinonStub).resolves([{ test: 'test' }]);
    (mockAdapter.findOne as sinon.SinonStub).resolves({ test: 'test' })
    bot.adapters.storage = mockAdapter
    bot.settings.set('autoSave', false)
  })
  after(() => delete bot.adapters.storage)
  describe('.clearMemory', () => {
    it('resets to initial memory collections', () => {
      bot.clearMemory()
      expect(bot.memory).to.eql({ users: {}, private: {} })
    })
  })
  describe('.saveMemory', () => {
    it('emits event with current memory', async () => {
      const save = sinon.spy()
      bot.events.on('save', (memory) => save(memory))
      await bot.saveMemory()
      sinon.assert.calledWithExactly(save, bot.memory)
    })
    it('stops and restarts the save interval', async () => {
      const clearSaveInterval = sinon.spy(bot, 'clearSaveInterval')
      const setSaveInterval = sinon.spy(bot, 'setSaveInterval')
      await bot.saveMemory()
      sinon.assert.calledOnce(clearSaveInterval)
      sinon.assert.calledOnce(setSaveInterval)
      clearSaveInterval.restore()
      setSaveInterval.restore()
    })
  })
  describe('.loadMemory', () => {
    it('populates memory with data from storage adapter', async () => {
      await bot.loadMemory()
      expect(bot.memory).to.eql({
        users: {}, private: {}, test: { foo: 'bar' }
      })
    })
    it('merges existing key/value pairs with any loaded', async () => {
      bot.clearMemory()
      bot.memory.test = { baz: 'qux' }
      await bot.loadMemory()
      expect(bot.memory).to.eql({
        users: {}, private: {}, test: { foo: 'bar', baz: 'qux' }
      })
    })
  })
  describe('.setSaveInterval', () => {
    beforeEach(() => sinon.spy(bot, 'saveMemory'))
    afterEach(() => (bot.saveMemory as sinon.SinonSpy).restore())
    it('calls saveMemory after interval', async () => {
      bot.settings.set('autoSave', true)
      bot.setSaveInterval(20)
      await delay(50)
      sinon.assert.calledTwice(bot.saveMemory as sinon.SinonSpy)
      bot.settings.set('autoSave', false)
      clearInterval(bot.intervals.save.timer)
    })
  })
  describe('.clearSaveInterval', () => {
    beforeEach(() => sinon.spy(bot, 'saveMemory'))
    afterEach(() => (bot.saveMemory as sinon.SinonSpy).restore())
    it('stops saveMemory from calling', async () => {
      bot.settings.set('autoSave', true)
      bot.setSaveInterval(100)
      expect((bot.intervals.save.timer as any)._idleTimeout).to.equal(100)
      bot.clearSaveInterval()
      expect((bot.intervals.save.timer as any)._idleTimeout).to.equal(-1)
      sinon.assert.notCalled(bot.saveMemory as sinon.SinonSpy)
      bot.settings.set('autoSave', false)
    })
  })
  describe('.set', () => {
    it('adds key/value pair to memory in given collection', () => {
      bot.set('test-id', { test: 'test' }, 'tests')
      expect(bot.memory.tests).to.eql({ 'test-id': { test: 'test' } })
    })
  })
  describe('.get', () => {
    it('retrieves data by key in memory collection', () => {
      bot.set('test-id', { test: 'test' }, 'tests')
      expect(bot.get('test-id', 'tests')).to.eql({ test: 'test' })
    })
  })
  describe('.unset', () => {
    it('removes data by key in memory collection', () => {
      bot.set('test-id', { test: 'test' }, 'tests')
      bot.unset('test-id', 'tests')
      expect(bot.memory.tests).to.eql({})
    })
  })
  describe('.keep', () => {
    it('passes args to storage adapter keep', async () => {
      let stub = (mockAdapter.keep as sinon.SinonStub)
      await bot.keep('tests', { a: 'b' })
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
    it('removes bot from kept states', async () => {
      let message = new bot.TextMessage(new bot.User(), 'testing')
      let b = new bot.State({ message: message })
      let stub = (mockAdapter.keep as sinon.SinonStub)
      await bot.keep('test-state', b)
      sinon.assert.calledWithExactly(stub, 'test-state', sinon.match({ message }))
      stub.resetHistory()
    })
    it('does not keep any excluded data keys', async () => {
      bot.keepExcludes.push('foo')
      let stub = (mockAdapter.keep as sinon.SinonStub)
      await bot.keep('tests', { foo: 'foo', bar: 'bar' })
      sinon.assert.calledWithExactly(stub, 'tests', { bar: 'bar' })
      stub.resetHistory()
    })
  })
  describe('.find', () => {
    it('passes args to storage adapter keep', async () => {
      await bot.find('tests', { a: 'b' })
      let stub = (mockAdapter.find as sinon.SinonStub)
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
    it('resolves with returned values', async () => {
      const result = await bot.find('', {})
      expect(result).to.eql([{ test: 'test' }])
    })
  })
  describe('.findOne', () => {
    it('passes args to storage adapter keep', async () => {
      await bot.findOne('tests', { a: 'b' })
      let stub = (mockAdapter.findOne as sinon.SinonStub)
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
    it('resolves with returned value', async () => {
      const result = await bot.findOne('', {})
      expect(result).to.eql({ test: 'test' })
    })
  })
  describe('.lose', () => {
    it('passes args to storage adapter keep', async () => {
      await bot.lose('tests', { a: 'b' })
      let stub = (mockAdapter.lose as sinon.SinonStub)
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
  })
  describe('.startMemory', () => {
    afterEach(() => clearInterval(bot.intervals.save.timer))
    it('loads brain from store', async () => {
      bot.clearMemory()
      await bot.startMemory()
      expect(bot.memory).to.eql({
        users: {}, private: {}, test: { foo: 'bar' }
      })
    })
    it('starts timeout', async () => {
      bot.clearMemory()
      const setSaveInterval = sinon.spy(bot, 'setSaveInterval')
      await bot.startMemory()
      sinon.assert.calledOnce(setSaveInterval)
      setSaveInterval.restore()
      clearInterval(bot.intervals.save.timer)
    })
  })
  describe('.shutdownMemory', () => {
    beforeEach(() => bot.shutdownMemory())
    it('saves memory', async () => {
      const spy = sinon.spy(bot, 'saveMemory')
      await bot.shutdownMemory()
      sinon.assert.calledOnce(spy)
      spy.restore()
    })
    it('clears save interval', async () => {
      const spy = sinon.spy(bot, 'clearSaveInterval')
      await bot.shutdownMemory()
      sinon.assert.called(spy)
      spy.restore()
    })
  })
  describe('.user', () => {
    it('returns all user objects, appropriately typed', () => {
      bot.memory.users = mockUsers
      expect(bot.users()).to.eql(mockUsers)
      expect(bot.memory.users.u1).to.be.instanceof(bot.User)
    })
    it('returns users from load after memory cleared', async () => {
      (mockAdapter.loadMemory as sinon.SinonStub).resolves({ users: mockUsers })
      bot.clearMemory()
      await bot.loadMemory()
      expect(bot.memory.users.u1).to.be.instanceof(bot.User)
      expect(bot.users()).to.eql(mockUsers)
    })
  })
  describe('.userById', () => {
    it('returns user for ID', () => {
      bot.memory.users = mockUsers
      expect(bot.userById('u1')).to.eql(mockUsers.u1)
    })
    it('stores given user against ID', () => {
      bot.memory.users = mockUsers
      const newUser = new bot.User({ id: 'u3', name: 'test-3' })
      expect(bot.userById('u3', newUser))
        .to.eql(newUser)
    })
    it('creates user from plain object', () => {
      const newUser = new bot.User({ id: 'u3', name: 'test-3' })
      expect(bot.userById('u3', { id: 'u3', name: 'test-3' }))
        .to.eql(newUser).and.be.instanceof(bot.User)
    })
    it('updates existing user', () => {
      bot.memory.users = mockUsers
      const u2Update = new bot.User({ id: 'u2', name: 'newName' })
      expect(bot.userById('u2', u2Update)).to.eql(u2Update)
    })
  })
  describe('.usersByName', () => {
    beforeEach(() => {
      bot.memory.users = mockUsers
      bot.memory.users.u1.name = 'test'
      bot.memory.users.u2.name = 'test'
      bot.memory.users.u3 = new bot.User({ id: 'u3', name: 'test-3' })
    })
    it('returns array of users sharing a name', () => {
      expect(bot.usersByName('test')).to.eql([
        bot.memory.users.u1,
        bot.memory.users.u2
      ])
    })
    it('name matches are case-insensitive', () => {
      expect(bot.usersByName('TeST-3')).to.eql([
        bot.memory.users.u3
      ])
    })
  })
})
