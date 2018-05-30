import 'mocha'
import sinon from 'sinon'
import * as bot from '../..'
import { expect } from 'chai'
import { MessageAdapter } from './message'

let log: sinon.SinonSpy
let mockAdapter: bot.MessageAdapter

describe('message adapter', () => {
  before(() => {
    log = sinon.spy(bot.logger, 'debug')
    class MockAdapter extends MessageAdapter {
      name = 'mock-message-adapter'
    }
    mockAdapter = new MockAdapter(bot)
  })
  beforeEach(() => log.resetHistory())
  after(() => log.restore())
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
