import 'mocha'
import sinon from 'sinon'
import * as bot from '../..'
import { expect } from 'chai'
import { MessageAdapter } from './message'

let log: sinon.SinonSpy
let mockAdapter: bot.MessageAdapter

describe('[adapter-message]', () => {
  before(() => {
    log = sinon.spy(bot.logger, 'debug')
    class MockAdapter extends MessageAdapter {
      name = 'mock-message-adapter'
      async start () { return }
      async shutdown () { return }
      async dispatch (envelope: bot.Envelope) { console.info(envelope) }
    }
    mockAdapter = new MockAdapter(bot)
  })
  beforeEach(() => log.resetHistory())
  after(() => log.restore())
  describe('MessageAdapter', () => {
    it('allows extending', () => {
      expect(mockAdapter).to.be.instanceof(MessageAdapter)
    })
  })
})
