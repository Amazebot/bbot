import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import config from '../util/config'
import { adapters } from './adapter'
import { store } from './store'
import { messages } from './message'
import { users } from './user'
import { State } from './state'

import * as mock from '../test/mock'

describe('[store]', () => {
  describe('Store', () => {
    beforeEach(() => {
      mock.adapters.reset()
      adapters.loaded.storage = mock.adapters.storage
    })
    describe('.keep', () => {
      it('passes args to storage adapter keep', async () => {
        await store.keep('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mock.adapters.storage.keep, 'tests', { a: 'b' })
      })
      it('removes bot from kept states', async () => {
        let message = messages.text(users.create(), 'testing')
        await store.keep('test-state', new State({ message }))
        sinon.assert.calledWithExactly(mock.adapters.storage.keep, 'test-state', sinon.match({ message }))
      })
      it('does not keep any excluded data keys', async () => {
        config.set('storage-excludes', ['foo'])
        await store.keep('tests', { foo: 'foo', bar: 'bar' })
        sinon.assert.calledWithExactly(mock.adapters.storage.keep, 'tests', { bar: 'bar' })
        config.reset()
      })
    })
    describe('.find', () => {
      it('passes args to storage adapter keep', async () => {
        await store.find('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mock.adapters.storage.find, 'tests', { a: 'b' })
      })
      it('resolves with returned values', async () => {
        const result = await store.find('', {})
        expect(result).to.eql([{ test: 'test' }])
      })
    })
    describe('.findOne', () => {
      it('passes args to storage adapter keep', async () => {
        await store.findOne('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mock.adapters.storage.findOne, 'tests', { a: 'b' })
      })
      it('resolves with returned value', async () => {
        const result = await store.findOne('', {})
        expect(result).to.eql({ test: 'test' })
      })
    })
    describe('.lose', () => {
      it('passes args to storage adapter keep', async () => {
        await store.lose('tests', { a: 'b' })
        sinon.assert.calledWithExactly(mock.adapters.storage.lose, 'tests', { a: 'b' })
      })
    })
  })
})
