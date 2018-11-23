import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import axios from 'axios'
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
    bot.path.text({ after: 'call me', before: 'please' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    bot.path.text({ after: 'call me' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    await bot.receive(new bot.TextMessage(new bot.User(), 'Call me bb, please'))
    expect(captured).to.eql(['bb', 'bb, please'])
  })
  it('responds with custom attachment attributes', async () => {
    let attachment = {
      'title': 'a custom attachment payload',
      'actions': [{
        'type': 'button',
        'text': 'Visit Google',
        'url': 'http://www.google.com',
        'is_webview': true,
        'webview_height_ratio': 'compact'
      }]
    }
    bot.path.text(/attachment/i, (b) => b.respond(attachment))
    await bot.receive(new bot.TextMessage(new bot.User(), 'Do attachment'))
    sinon.assert.calledWithMatch(mocks.dispatch, { _payload: {
      attachments: [attachment]
    } })
  })
  it('replies to user from server message', async () => {
    bot.path.server({ test: 1 }, (b) => b.respond('testing'), { id: 'e2e' })
    await axios.get(`${bot.server.url()}/message/111?test=1`)
    sinon.assert.calledWithMatch(mocks.dispatch, { strings: ['testing'] })
  })
})
