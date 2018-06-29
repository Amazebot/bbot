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
      async start () { return }
      async shutdown () { return }
      async dispatch (envelope) { console.log(envelope) }
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
})
