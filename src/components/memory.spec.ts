import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import config from '../util/config'
import { memory, saveInterval } from './memory'
import { adapters } from './adapter'
import { users } from './user'

import * as mocks from '../test/mocks'
import { delay } from '../test/utils'

describe('[memory]', () => {
  before(() => {
    config.set('autoSave', false)
    adapters.loaded.storage = mocks.storageAdapter()
  })
  describe('Memory', () => {
    describe('.clear', () => {
      it('resets to initial memory collections', () => {
        memory.users = { 'foo': users.create({ id: 'foo' }) }
        memory.clear()
        expect(memory.toObject()).to.eql({ private: {}, rooms: {}, users: {} })
      })
    })
    describe('.save', () => {
      it('stops and restarts the save interval', async () => {
        const clearSaveInterval = sinon.stub(memory, 'clearSaveInterval')
        const setSaveInterval = sinon.stub(memory, 'setSaveInterval')
        await memory.save()
        sinon.assert.calledOnce(clearSaveInterval)
        sinon.assert.calledOnce(setSaveInterval)
        clearSaveInterval.restore()
        setSaveInterval.restore()
      })
    })
    describe('.load', () => {
      it('populates memory with data from storage adapter', async () => {
        await memory.load()
        expect(memory.toObject()).to.eql({
          private: {}, rooms: {}, users: {}, test: { foo: 'bar' }
        })
      })
      it('merges existing key/value pairs with any loaded', async () => {
        memory.clear()
        memory.test = { baz: 'qux' }
        await memory.load()
        expect(memory.toObject()).to.eql({
          private: {}, rooms: {}, users: {}, test: { foo: 'bar', baz: 'qux' }
        })
      })
    })
    describe('.setSaveInterval', () => {
      it('calls saveMemory after interval', async () => {
        const save = sinon.spy(memory, 'save')
        config.set('autoSave', true)
        memory.setSaveInterval(20)
        await delay(50)
        sinon.assert.calledTwice(save)
        config.set('autoSave', false)
        if (saveInterval.timer) {
          global.clearInterval(saveInterval.timer)
        }
        save.restore()
      })
    })
    describe('.clearSaveInterval', () => {
      it('stops saveMemory from calling', async () => {
        const save = sinon.spy(memory, 'save')
        config.set('autoSave', true)
        memory.setSaveInterval(100)
        expect((saveInterval.timer as any)._idleTimeout).to.equal(100)
        memory.clearSaveInterval()
        expect((saveInterval.timer as any)._idleTimeout).to.equal(-1)
        sinon.assert.notCalled(save)
        config.set('autoSave', false)
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
        if (saveInterval.timer) {
          global.clearInterval(saveInterval.timer)
        }
      })
      it('loads brain from store', async () => {
        memory.clear()
        await memory.start()
        expect(memory.toObject()).to.eql({
          private: {}, rooms: {}, users: {}, test: { foo: 'bar' }
        })
      })
      it('starts timeout', async () => {
        const setSaveInterval = sinon.stub(memory, 'setSaveInterval')
        memory.clear()
        await memory.start()
        sinon.assert.calledOnce(setSaveInterval)
        if (saveInterval.timer) {
          global.clearInterval(saveInterval.timer)
        }
        setSaveInterval.restore()
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
        const clearSaveInterval = sinon.stub(memory, 'clearSaveInterval')
        await memory.shutdown()
        sinon.assert.called(clearSaveInterval)
        clearSaveInterval.restore()
      })
    })
  })
})
