import 'mocha'
import sinon from 'sinon'
import * as bot from '../..'
import { expect } from 'chai'
import { MessageAdapter } from './message'

const log = sinon.spy(bot.logger, 'debug')
class MockAdapter extends MessageAdapter {
  name = 'mock-message-adapter'
  async start () { /* mock start */ }
  async shutdown () { /* mock shutdown */ }
}
const mockAdapter = new MockAdapter(bot)

describe('message adapter', () => {
  beforeEach(() => log.resetHistory())
  describe('constructor', () => {
    it('allows extending', () => {
      expect(mockAdapter).to.be.instanceof(MessageAdapter)
    })
  })
  describe('.hear', () => {
    it('logs debug', async () => {
      await mockAdapter.hear('testing')
      sinon.assert.calledWithMatch(log, /hear/, { message: 'testing' })
    })
  })
  describe('.respond', () => {
    it('logs debug', async () => {
      const envelope = bot.createEnvelope({ user: new bot.User() })
      await mockAdapter.respond(envelope, 'test')
      sinon.assert.calledWithMatch(log, /test/, { envelope })
    })
  })
})
