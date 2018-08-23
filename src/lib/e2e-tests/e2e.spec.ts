import 'mocha'
import sinon from 'sinon'
// import { expect } from 'chai'
import * as bot from '../..'

class MockMessenger extends bot.MessageAdapter {
  name = 'mock-messenger'
  async dispatch () { return }
  async start () { return }
  async shutdown () { return }
}
const sandbox = sinon.createSandbox()

describe('[E2E]', () => {
  beforeEach(() => {
    bot.adapters.message = new MockMessenger(bot)
    return bot.start()
  })
  afterEach(() => {
    sandbox.restore()
    return bot.reset()
  })
  it('responds from middleware', async () => {
    bot.adapters.message!.dispatch = sandbox.stub()
    bot.middlewares.load()
    bot.middleware.hear((b, _, done) => b.respond('test').then(() => done()))
    await bot.receive(new bot.TextMessage(new bot.User(), ''))
    sinon.assert.calledOnce((bot.adapters.message!.dispatch as sinon.SinonStub))
    bot.middlewares.unload()
  })
})
