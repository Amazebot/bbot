import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import config from '../util/config'
import { adapters } from './adapter'
import { store } from './store'
import { messages } from './message'
import { users } from './user'
import { State } from './state'

import * as mocks from '../test/mocks'
let mockStorage: mocks.MockStorageAdapterStub

describe('[store]', () => {
  describe('Store', () => {
    before(() => {
      mockStorage = mocks.stubStorageAdapter()
      adapters.loaded.storage = mockStorage
    })
    after(() => delete adapters.loaded.storage)
    describe('.keep', () => {
      afterEach(() => mockStorage.keep.resetHistory())
      it('passes args to storage adapter keep', async () => {
        await store.keep('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mockStorage.keep, 'tests', { a: 'b' })
      })
      it('removes bot from kept states', async () => {
        let message = messages.text(users.create(), 'testing')
        await store.keep('test-state', new State({ message }))
        sinon.assert.calledWithExactly(mockStorage.keep, 'test-state', sinon.match({ message }))
      })
      it('does not keep any excluded data keys', async () => {
        config.set('storage-excludes', ['foo'])
        await store.keep('tests', { foo: 'foo', bar: 'bar' })
        sinon.assert.calledWithExactly(mockStorage.keep, 'tests', { bar: 'bar' })
        config.reset()
      })
    })
    describe('.find', () => {
      afterEach(() => mockStorage.find.resetHistory())
      it('passes args to storage adapter keep', async () => {
        await store.find('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mockStorage.find, 'tests', { a: 'b' })
      })
      it('resolves with returned values', async () => {
        const result = await store.find('', {})
        expect(result).to.eql([{ test: 'test' }])
      })
    })
    describe('.findOne', () => {
      afterEach(() => mockStorage.findOne.resetHistory())
      it('passes args to storage adapter keep', async () => {
        await store.findOne('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mockStorage.findOne, 'tests', { a: 'b' })
      })
      it('resolves with returned value', async () => {
        const result = await store.findOne('', {})
        expect(result).to.eql({ test: 'test' })
      })
    })
    describe('.lose', () => {
      afterEach(() => mockStorage.findOne.resetHistory())
      it('passes args to storage adapter keep', async () => {
        await store.lose('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mockStorage.lose, 'tests', { a: 'b' })
        mockStorage.findOne.resetHistory()
      })
    })
  })
})
