import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { adapters, abstracts } from './adapter'
import { store } from './store'
import { messages } from './message'
import { users } from './user'
import { State } from './state'

class MockStorageAdapter extends abstracts.StorageAdapter {
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
let mockAdapter: MockStorageAdapter

describe('[store]', () => {
  describe('Store', () => {
    before(() => {
      mockAdapter = sinon.createStubInstance(MockStorageAdapter);
      (mockAdapter.loadMemory as sinon.SinonStub).resolves({ test: { foo: 'bar' } });
      (mockAdapter.find as sinon.SinonStub).resolves([{ test: 'test' }]);
      (mockAdapter.findOne as sinon.SinonStub).resolves({ test: 'test' })
      adapters.loaded.storage = mockAdapter
    })
    after(() => delete adapters.loaded.storage)
    describe('.keep', () => {
      it('passes args to storage adapter keep', async () => {
        let stub = (mockAdapter.keep as sinon.SinonStub)
        await store.keep('tests', { a: 'b' })
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
      it('removes bot from kept states', async () => {
        let message = messages.text(users.create(), 'testing')
        let b = new State({ message })
        let stub = (mockAdapter.keep as sinon.SinonStub)
        await store.keep('test-state', b)
        sinon.assert.calledWithExactly(stub, 'test-state', sinon.match({ message }))
        stub.resetHistory()
      })
      it('does not keep any excluded data keys', async () => {
        store.excludes.push('foo')
        let stub = (mockAdapter.keep as sinon.SinonStub)
        await store.keep('tests', { foo: 'foo', bar: 'bar' })
        sinon.assert.calledWithExactly(stub, 'tests', { bar: 'bar' })
        stub.resetHistory()
      })
    })
    describe('.find', () => {
      it('passes args to storage adapter keep', async () => {
        await store.find('tests', { a: 'b' })
        let stub = (mockAdapter.find as sinon.SinonStub)
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
      it('resolves with returned values', async () => {
        const result = await store.find('', {})
        expect(result).to.eql([{ test: 'test' }])
      })
    })
    describe('.findOne', () => {
      it('passes args to storage adapter keep', async () => {
        await store.findOne('tests', { a: 'b' })
        let stub = (mockAdapter.findOne as sinon.SinonStub)
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
      it('resolves with returned value', async () => {
        const result = await store.findOne('', {})
        expect(result).to.eql({ test: 'test' })
      })
    })
    describe('.lose', () => {
      it('passes args to storage adapter keep', async () => {
        await store.lose('tests', { a: 'b' })
        let stub = (mockAdapter.lose as sinon.SinonStub)
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
    })
  })
})
