import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import axios from 'axios'
import bBot, { abstracts } from '.'

class MockMessageAdapter extends abstracts.MessageAdapter {
  name = 'mock-messenger'
  async dispatch () { return }
  async start () { return }
  async shutdown () { return }
}
const mocks = sinon.createStubInstance(MockMessageAdapter)

describe('[E2E]', () => {
  beforeEach(async () => {
    await bBot.reset()
    bBot.adapters.loaded.message = mocks
    await bBot.start()
  })
  afterEach(() => {
    mocks.dispatch.resetHistory()
  })
  it('responds from middleware', async () => {
    bBot.middlewares.register('hear', (b, _, done) => {
      return b.respond('test').then(() => done())
    })
    await bBot.thoughts.receive(bBot.messages.text(bBot.users.create(), ''))
    sinon.assert.calledOnce(mocks.dispatch)
  })
  it('captures input matching conditions', async () => {
    let captured: any[] = []
    bBot.branches.text({ after: 'call me', before: 'please' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    bBot.branches.text({ after: 'call me' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    const msg = bBot.messages.text(bBot.users.create(), 'Call me bb, please')
    await bBot.thoughts.receive(msg)
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
    bBot.branches.text(/attachment/i, (b) => b.respond(attachment))
    const msg = bBot.messages.text(bBot.users.create(), 'Do attachment')
    await bBot.thoughts.receive(msg)
    sinon.assert.calledWithMatch(mocks.dispatch, { _payload: {
      attachments: [attachment]
    } })
  })
  it('replies to user from server message', async () => {
    bBot.branches.server({ test: 1 }, (b) => {
      return b.respond(`testing ${ b.message.data.test }`)
    })
    await axios.get(`${bBot.server.url}/message/111?test=1`)
    sinon.assert.calledWithMatch(mocks.dispatch, { strings: ['testing 1'] })
  })
})
