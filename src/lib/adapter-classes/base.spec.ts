import 'mocha'
import sinon from 'sinon'
import * as bot from '../..'
import { expect } from 'chai'
import { Adapter } from './base'

describe('base adapter', () => {
  describe('constructor', () => {
    it('allows extending', () => {
      class MockAdapter extends Adapter {
        name = 'mock-adapter'
        async start () { /* mock start */ }
        async shutdown () { /* mock shutdown */ }
      }
      const mockAdapter = new MockAdapter(bot)
      expect(mockAdapter).to.be.instanceof(Adapter)
    })
    it('inherits bot properties', () => {
      class MockAdapter extends Adapter {
        name = 'mock-adapter'
      }
      const mockAdapter = new MockAdapter(bot)
      expect(mockAdapter.bot).to.include.all.keys([
        'events',
        'config',
        'logger',
        'middlewares',
        'adapters',
        'start'
      ])
    })
  })
  describe('.start', () => {
    it('logs info', async () => {
      const log = sinon.spy(bot.logger, 'info')
      class MockAdapter extends Adapter {
        name = 'mock-adapter'
      }
      const mockAdapter = new MockAdapter(bot)
      await mockAdapter.start()
      sinon.assert.calledWithMatch(log, /start/)
      log.restore()
    })
  })
  describe('.shutdown', () => {
    it('logs info', async () => {
      const log = sinon.spy(bot.logger, 'info')
      class MockAdapter extends Adapter {
        name = 'mock-adapter'
      }
      const mockAdapter = new MockAdapter(bot)
      await mockAdapter.shutdown()
      sinon.assert.calledWithMatch(log, /shutdown/)
      log.restore()
    })
  })
})
