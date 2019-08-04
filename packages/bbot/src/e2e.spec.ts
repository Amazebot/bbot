import 'mocha'
import { expect } from 'chai'
import * as sinon from 'sinon'
import axios from 'axios'

import { bBot } from '.'
import * as mock from './test/mock'

/** @todo Fix E2E tests with updated usage and better assertions. */
describe.skip('[E2E]', () => {
  beforeEach(async () => {
    await bBot.reset()
    mock.adapters.reset()
    bBot.adapter.slots.message = mock.adapters.message
    await bBot.start()
  })
  it('responds from middleware', async () => {
    bBot.middlewares.register('hear', (b, _, done) => {
      return b.respond('test').then(() => done())
    })
    await bBot.thoughts.receive(bBot.messages.text(bBot.user.create(), ''))
    sinon.assert.calledOnce(mock.adapters.message.dispatch)
  })
  it('captures input matching conditions', async () => {
    let captured: any[] = []
    bBot.branches.text({ after: 'call me', before: 'please' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    bBot.branches.text({ after: 'call me' }, (b) => {
      captured.push(b.conditions.captured)
    }, { force: true })
    const msg = bBot.messages.text(bBot.user.create(), 'Call me bb, please')
    await bBot.thoughts.receive(msg)
    expect(captured).to.eql(['bb', 'bb, please'])
  })
  it('responds with custom attachment attributes', async () => {
    let attachment = {
      title: { text: 'a custom attachment payload' },
      actions: [{
        'type': 'button',
        'text': 'Visit Google',
        'value': 'http://www.google.com'
      }]
    }
    bBot.branches.text(/attachment/i, (b) => b.respond(attachment))
    const msg = bBot.messages.text(bBot.user.create(), 'Do attachment')
    await bBot.thoughts.receive(msg)
    // sinon.assert.calledWithMatch(mock.adapters.message.dispatch, { payload: {
    //   attachments: [attachment]
    // } })
  })
  it.skip('replies to user from server message', async () => {
    bBot.branches.server({ test: 1 }, (b) => {
      return b.respond(`testing ${ b.message.data.test }`)
    })
    await axios.get(`${bBot.server.url}/message/111?test=1`)
    // sinon.assert.calledWithMatch(mock.adapters.message.dispatch, { strings: ['testing 1'] })
  })
})
