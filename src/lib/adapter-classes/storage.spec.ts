import 'mocha'
import sinon from 'sinon'
import * as bot from '../..'
import { expect } from 'chai'
import { StorageAdapter } from './storage'

let log: sinon.SinonSpy
let mockAdapter: bot.StorageAdapter

describe('storage adapter', () => {
  before(() => {
    class MockAdapter extends StorageAdapter { name = 'mock-storage-adapter' }
    mockAdapter = new MockAdapter(bot)
    log = sinon.spy(bot.logger, 'debug')
  })
  beforeEach(() => log.resetHistory())
  after(() => log.restore())
  describe('constructor', () => {
    it('allows extending', () => {
      expect(mockAdapter).to.be.instanceof(StorageAdapter)
    })
  })
  describe('.saveMemory', () => {
    it('logs debug', async () => {
      await mockAdapter.saveMemory({})
      sinon.assert.calledWithMatch(log, /saveMemory/, { data: {} })
    })
  })
  describe('.loadMemory', () => {
    it('logs debug', async () => {
      await mockAdapter.loadMemory()
      sinon.assert.calledWithMatch(log, /loadMemory/)
    })
  })
  describe('.find', () => {
    it('logs debug', async () => {
      await mockAdapter.find('data', {})
      sinon.assert.calledWithMatch(log, /find/)
    })
  })
  describe('.findOne', () => {
    it('logs debug', async () => {
      await mockAdapter.findOne('data', {})
      sinon.assert.calledWithMatch(log, /findOne/)
    })
  })
  describe('.lose', () => {
    it('logs debug', async () => {
      await mockAdapter.lose('data', {})
      sinon.assert.calledWithMatch(log, /lose/)
    })
  })
})
