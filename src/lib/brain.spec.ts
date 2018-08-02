import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'
import * as brain from './brain'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
let mockAdapter: bot.StorageAdapter
const mockUsers = {
  'u1': new bot.User({ id: 'u1', name: 'test-1' }),
  'u2': new bot.User({ id: 'u2', name: 'test-2' })
}
class MockAdapter extends bot.StorageAdapter {
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

describe('[brain]', () => {
  before(() => {
    mockAdapter = sinon.createStubInstance(MockAdapter);
    (mockAdapter.loadMemory as sinon.SinonStub).resolves({ test: { foo: 'bar' } });
    (mockAdapter.find as sinon.SinonStub).resolves([{ test: 'test' }]);
    (mockAdapter.findOne as sinon.SinonStub).resolves({ test: 'test' })
    bot.adapters.storage = mockAdapter
    bot.config.autoSave = false
  })
  after(() => delete bot.adapters.storage)
  describe('.clearMemory', () => {
    it('resets to initial memory collections', () => {
      brain.clearMemory()
      expect(brain.memory).to.eql({ users: {}, private: {} })
    })
  })
  describe('.saveMemory', () => {
    it('emits event with current memory', async () => {
      const save = sinon.spy()
      bot.events.on('save', (memory) => save(memory))
      await brain.saveMemory()
      sinon.assert.calledWithExactly(save, brain.memory)
    })
    it('stops and restarts the save interval', async () => {
      const clearSaveInterval = sinon.spy(bot, 'clearSaveInterval')
      const setSaveInterval = sinon.spy(bot, 'setSaveInterval')
      await brain.saveMemory()
      sinon.assert.calledOnce(clearSaveInterval)
      sinon.assert.calledOnce(setSaveInterval)
      clearSaveInterval.restore()
      setSaveInterval.restore()
    })
  })
  describe('.loadMemory', () => {
    it('populates memory with data from storage adapter', async () => {
      await brain.loadMemory()
      expect(brain.memory).to.eql({
        users: {}, private: {}, test: { foo: 'bar' }
      })
    })
    it('merges existing key/value pairs with any loaded', async () => {
      brain.clearMemory()
      brain.memory.test = { baz: 'qux' }
      await brain.loadMemory()
      expect(brain.memory).to.eql({
        users: {}, private: {}, test: { foo: 'bar', baz: 'qux' }
      })
    })
  })
  describe('.setSaveInterval', () => {
    beforeEach(() => sinon.spy(bot, 'saveMemory'))
    afterEach(() => (bot.saveMemory as sinon.SinonSpy).restore())
    it('calls saveMemory after interval', async () => {
      bot.config.autoSave = true
      brain.setSaveInterval(20)
      await delay(50)
      sinon.assert.calledTwice(bot.saveMemory as sinon.SinonSpy)
      bot.config.autoSave = false
      clearInterval(brain.saveInterval)
    })
  })
  describe('.clearSaveInterval', () => {
    beforeEach(() => sinon.spy(bot, 'saveMemory'))
    afterEach(() => (bot.saveMemory as sinon.SinonSpy).restore())
    it('stops saveMemory from calling', async () => {
      bot.config.autoSave = true
      brain.setSaveInterval(100)
      expect((brain.saveInterval as any)._idleTimeout).to.equal(100)
      brain.clearSaveInterval()
      expect((brain.saveInterval as any)._idleTimeout).to.equal(-1)
      sinon.assert.notCalled(bot.saveMemory as sinon.SinonSpy)
      bot.config.autoSave = false
    })
  })
  describe('.set', () => {
    it('adds key/value pair to memory in given collection', () => {
      brain.set('test-id', { test: 'test' }, 'tests')
      expect(brain.memory.tests).to.eql({ 'test-id': { test: 'test' } })
    })
  })
  describe('.get', () => {
    it('retrieves data by key in memory collection', () => {
      brain.set('test-id', { test: 'test' }, 'tests')
      expect(brain.get('test-id', 'tests')).to.eql({ test: 'test' })
    })
  })
  describe('.unset', () => {
    it('removes data by key in memory collection', () => {
      brain.set('test-id', { test: 'test' }, 'tests')
      brain.unset('test-id', 'tests')
      expect(brain.memory.tests).to.eql({})
    })
  })
  describe('.keep', () => {
    it('passes args to storage adapter keep', async () => {
      let stub = (mockAdapter.keep as sinon.SinonStub)
      await brain.keep('tests', { a: 'b' })
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
    it('removes bot from kept states', async () => {
      let message = new bot.TextMessage(new bot.User(), 'testing')
      let b = new bot.State({ message: message })
      let stub = (mockAdapter.keep as sinon.SinonStub)
      await brain.keep('test-state', b)
      sinon.assert.calledWithExactly(stub, 'test-state', sinon.match({ message }))
      stub.resetHistory()
    })
    it('does not keep any excluded data keys', async () => {
      brain.keepExcludes.push('foo')
      let stub = (mockAdapter.keep as sinon.SinonStub)
      await brain.keep('tests', { foo: 'foo', bar: 'bar' })
      sinon.assert.calledWithExactly(stub, 'tests', { bar: 'bar' })
      stub.resetHistory()
    })
  })
  describe('.find', () => {
    it('passes args to storage adapter keep', async () => {
      await brain.find('tests', { a: 'b' })
      let stub = (mockAdapter.find as sinon.SinonStub)
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
    it('resolves with returned values', async () => {
      const result = await brain.find('', {})
      expect(result).to.eql([{ test: 'test' }])
    })
  })
  describe('.findOne', () => {
    it('passes args to storage adapter keep', async () => {
      await brain.findOne('tests', { a: 'b' })
      let stub = (mockAdapter.findOne as sinon.SinonStub)
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
    it('resolves with returned value', async () => {
      const result = await brain.findOne('', {})
      expect(result).to.eql({ test: 'test' })
    })
  })
  describe('.lose', () => {
    it('passes args to storage adapter keep', async () => {
      await brain.lose('tests', { a: 'b' })
      let stub = (mockAdapter.lose as sinon.SinonStub)
      sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
      stub.resetHistory()
    })
  })
  describe('.loadBrain', () => {
    afterEach(() => clearInterval(brain.saveInterval))
    it('starts the storage adapter', async () => {
      (mockAdapter.start as sinon.SinonStub).resetHistory()
      await bot.loadBrain()
      sinon.assert.calledOnce((mockAdapter.start as sinon.SinonStub))
    })
    it('loads brain from store', async () => {
      brain.clearMemory()
      await brain.loadBrain()
      expect(brain.memory).to.eql({
        users: {}, private: {}, test: { foo: 'bar' }
      })
    })
    it('starts timeout', async () => {
      brain.clearMemory()
      const setSaveInterval = sinon.spy(bot, 'setSaveInterval')
      await brain.loadBrain()
      sinon.assert.calledOnce(setSaveInterval)
      setSaveInterval.restore()
      clearInterval(brain.saveInterval)
    })
  })
  describe('.unloadBrain', () => {
    beforeEach(() => bot.loadBrain())
    it('saves memory', async () => {
      const spy = sinon.spy(bot, 'saveMemory')
      await bot.unloadBrain()
      sinon.assert.calledOnce(spy)
      spy.restore()
    })
    it('clears save interval', async () => {
      const spy = sinon.spy(bot, 'clearSaveInterval')
      await bot.unloadBrain()
      sinon.assert.called(spy)
      spy.restore()
    })
    it('shuts down storage adapter', async () => {
      (mockAdapter.shutdown as sinon.SinonStub).resetHistory()
      await bot.unloadBrain()
      sinon.assert.calledOnce((mockAdapter.shutdown as sinon.SinonStub))
    })
  })
  describe('.user', () => {
    it('returns all user objects, appropriately typed', () => {
      brain.memory.users = mockUsers
      expect(brain.users()).to.eql(mockUsers)
      expect(brain.memory.users.u1).to.be.instanceof(bot.User)
    })
    it('returns users from load after memory cleared', async () => {
      (mockAdapter.loadMemory as sinon.SinonStub).resolves({ users: mockUsers })
      brain.clearMemory()
      await brain.loadMemory()
      expect(brain.memory.users.u1).to.be.instanceof(bot.User)
      expect(brain.users()).to.eql(mockUsers)
    })
  })
  describe('.userById', () => {
    it('returns user for ID', () => {
      brain.memory.users = mockUsers
      expect(brain.userById('u1')).to.eql(mockUsers.u1)
    })
    it('stores given user against ID', () => {
      brain.memory.users = mockUsers
      const newUser = new bot.User({ id: 'u3', name: 'test-3' })
      expect(brain.userById('u3', newUser))
        .to.eql(newUser)
    })
    it('creates user from plain object', () => {
      const newUser = new bot.User({ id: 'u3', name: 'test-3' })
      expect(brain.userById('u3', { id: 'u3', name: 'test-3' }))
        .to.eql(newUser).and.be.instanceof(bot.User)
    })
    it('updates existing user', () => {
      brain.memory.users = mockUsers
      const u2Update = new bot.User({ id: 'u2', name: 'newName' })
      expect(brain.userById('u2', u2Update)).to.eql(u2Update)
    })
  })
  describe('.usersByName', () => {
    beforeEach(() => {
      brain.memory.users = mockUsers
      brain.memory.users.u1.name = 'test'
      brain.memory.users.u2.name = 'test'
      brain.memory.users.u3 = new bot.User({ id: 'u3', name: 'test-3' })
    })
    it('returns array of users sharing a name', () => {
      expect(brain.usersByName('test')).to.eql([
        brain.memory.users.u1,
        brain.memory.users.u2
      ])
    })
    it('name matches are case-insensitive', () => {
      expect(brain.usersByName('TeST-3')).to.eql([
        brain.memory.users.u3
      ])
    })
  })
})
