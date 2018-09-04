import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '../..'

class MockMessenger extends bot.MessageAdapter {
  async dispatch () { return }
  async start () { return }
  async shutdown () { return }
}
const mocks = sinon.createStubInstance(MockMessenger)
mocks.name = 'mock-messenger'

describe('[E2E]', () => {
  beforeEach(async () => {
    await bot.reset()
    bot.adapters.message = mocks
    await bot.start()
  })
  afterEach(() => {
    mocks.dispatch.resetHistory()
  })
  it('responds from middleware', async () => {
    bot.middleware.hear((b, _, done) => {
      return b.respond('test').then(() => done())
    })
    await bot.receive(new bot.TextMessage(new bot.User(), ''))
    sinon.assert.calledOnce(mocks.dispatch)
  })
  it('captures input matching conditions', async () => {
    let captured: any[] = []
    bot.global.text({ after: 'call me', before: 'please' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    bot.global.text({ after: 'call me' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    await bot.receive(new bot.TextMessage(new bot.User(), 'Call me bb, please'))
    expect(captured).to.eql(['bb', 'bb, please'])
  })
})
