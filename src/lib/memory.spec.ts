import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const mockUsers = {
  'u1': new bot.User({ id: 'u1', name: 'test-1' }),
  'u2': new bot.User({ id: 'u2', name: 'test-2' })
}
let mockAdapter: bot.StorageAdapter
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
    mockAdapter = sinon.createStubInstance(MockStorageAdapter)
    bot.settings.set('autoSave', false)
    sinon.spy(bot.memory, 'setSaveInterval')
    sinon.spy(bot.memory, 'clearSaveInterval');
    (mockAdapter.loadMemory as sinon.SinonStub).resolves({ test: { foo: 'bar' } });
    (mockAdapter.find as sinon.SinonStub).resolves([{ test: 'test' }]);
    (mockAdapter.findOne as sinon.SinonStub).resolves({ test: 'test' })
    bot.adapters.storage = mockAdapter
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
        bot.memory.users = { 'foo': new bot.User({ id: 'foo' }) }
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
        bot.settings.set('autoSave', true)
        bot.memory.setSaveInterval(20)
        await delay(50)
        sinon.assert.calledTwice(save)
        bot.settings.set('autoSave', false)
        if (bot.intervals.save.timer) {
          global.clearInterval(bot.intervals.save.timer)
        }
        save.restore()
      })
    })
    describe('.clearSaveInterval', () => {
      it('stops saveMemory from calling', async () => {
        const save = sinon.spy(bot.memory, 'save')
        bot.settings.set('autoSave', true)
        bot.memory.setSaveInterval(100)
        expect((bot.intervals.save.timer as any)._idleTimeout).to.equal(100)
        bot.memory.clearSaveInterval()
        expect((bot.intervals.save.timer as any)._idleTimeout).to.equal(-1)
        sinon.assert.notCalled(save)
        bot.settings.set('autoSave', false)
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
        if (bot.intervals.save.timer) {
          global.clearInterval(bot.intervals.save.timer)
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
        if (bot.intervals.save.timer) {
          global.clearInterval(bot.intervals.save.timer)
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
  describe('.users', () => {
    it('returns all user objects, appropriately typed', () => {
      bot.memory.users = mockUsers
      expect(bot.users()).to.eql(mockUsers)
      expect(bot.users().u1).to.be.instanceof(bot.User)
    })
    it('returns users from load after memory cleared', async () => {
      (mockAdapter.loadMemory as sinon.SinonStub).resolves({ users: mockUsers })
      bot.memory.clear()
      await bot.memory.load()
      expect(bot.users().u1).to.be.instanceof(bot.User)
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
    it('updates user by reference', () => {
      bot.memory.users = mockUsers
      const user = bot.userById('u1')
      user.foo = 'foo'
      const reUser = bot.userById('u1')
      expect(reUser.foo).to.equal('foo')
    })
    it('merges data from sequential lookups', () => {
      const add1 = (u: any) => u.count = (u.count) ? u.count + 1 : 1
      bot.memory.users = mockUsers
      add1(bot.userById('u1', { foo: 'foo' }))
      add1(bot.userById('u1', { bar: 'bar' }))
      expect(bot.userById('u1')).to.include({
        id: 'u1',
        name: 'test-1',
        foo: 'foo',
        bar: 'bar',
        count: 2
      })
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
