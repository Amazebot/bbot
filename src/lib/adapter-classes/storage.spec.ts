import 'mocha'
import sinon from 'sinon'
import * as bot from '../..'
import { expect } from 'chai'
import { StorageAdapter } from './storage'

let log: sinon.SinonSpy
let mockAdapter: bot.StorageAdapter

describe('[adapter-storage]', () => {
  before(() => {
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
    mockAdapter = new MockAdapter(bot)
    log = sinon.spy(bot.logger, 'debug')
  })
  beforeEach(() => log.resetHistory())
  after(() => log.restore())
  describe('StorageAdapter', () => {
    it('allows extending', () => {
      expect(mockAdapter).to.be.instanceof(StorageAdapter)
    })
  })
})
