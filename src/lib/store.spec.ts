import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '.'

let mockAdapter: bot.adapter.Storage
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

describe('[store]', () => {
  describe('Store', () => {
    before(() => {
      mockAdapter = sinon.createStubInstance(MockStorageAdapter);
      (mockAdapter.loadMemory as sinon.SinonStub).resolves({ test: { foo: 'bar' } });
      (mockAdapter.find as sinon.SinonStub).resolves([{ test: 'test' }]);
      (mockAdapter.findOne as sinon.SinonStub).resolves({ test: 'test' })
      bot.adapter.adapters.storage = mockAdapter
    })
    after(() => delete bot.adapter.adapters.storage)
    describe('.keep', () => {
      it('passes args to storage adapter keep', async () => {
        let stub = (mockAdapter.keep as sinon.SinonStub)
        await bot.store.keep('tests', { a: 'b' })
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
      it('removes bot from kept states', async () => {
        let message = bot.message.text(bot.user.create(), 'testing')
        let b = bot.state.create({ message: message })
        let stub = (mockAdapter.keep as sinon.SinonStub)
        await bot.store.keep('test-state', b)
        sinon.assert.calledWithExactly(stub, 'test-state', sinon.match({ message }))
        stub.resetHistory()
      })
      it('does not keep any excluded data keys', async () => {
        bot.store.excludes.push('foo')
        let stub = (mockAdapter.keep as sinon.SinonStub)
        await bot.store.keep('tests', { foo: 'foo', bar: 'bar' })
        sinon.assert.calledWithExactly(stub, 'tests', { bar: 'bar' })
        stub.resetHistory()
      })
    })
    describe('.find', () => {
      it('passes args to storage adapter keep', async () => {
        await bot.store.find('tests', { a: 'b' })
        let stub = (mockAdapter.find as sinon.SinonStub)
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
      it('resolves with returned values', async () => {
        const result = await bot.store.find('', {})
        expect(result).to.eql([{ test: 'test' }])
      })
    })
    describe('.findOne', () => {
      it('passes args to storage adapter keep', async () => {
        await bot.store.findOne('tests', { a: 'b' })
        let stub = (mockAdapter.findOne as sinon.SinonStub)
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
      it('resolves with returned value', async () => {
        const result = await bot.store.findOne('', {})
        expect(result).to.eql({ test: 'test' })
      })
    })
    describe('.lose', () => {
      it('passes args to storage adapter keep', async () => {
        await bot.store.lose('tests', { a: 'b' })
        let stub = (mockAdapter.lose as sinon.SinonStub)
        sinon.assert.calledWithExactly(stub, 'tests', { a: 'b' })
        stub.resetHistory()
      })
    })
  })
})
