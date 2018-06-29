import 'mocha'
import * as bot from '../..'
import { expect } from 'chai'
import { Adapter } from './base'

class MockAdapter extends Adapter {
  name = 'mock-adapter'
  async start () { /* mock start */ }
  async shutdown () { /* mock shutdown */ }
}

describe('base adapter', () => {
  describe('constructor', () => {
    it('allows extending', () => {
      const mockAdapter = new MockAdapter(bot)
      expect(mockAdapter).to.be.instanceof(Adapter)
    })
    it('inherits bot properties', () => {
      class MockAdapter extends Adapter {
        name = 'mock-adapter'
        async start () { return }
        async shutdown () { return }
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
})
