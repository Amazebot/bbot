import 'mocha'
import { expect } from 'chai'
import * as bot from '..'
import * as rocketchat from './rocketchat'

const rc = rocketchat.use(bot)

describe('[rocketchat]', () => {
  describe('.parseEnvelope', () => {
    it('accepts attachments preformed for Rocket.Chat', () => {
      let attachment = {
        'fallback': 'a link to google',
        'title': 'a custom attachment payload',
        'actions': [{
          'type': 'button',
          'text': 'Visit Google',
          'url': 'http://www.google.com',
          'is_webview': true,
          'webview_height_ratio': 'compact'
        }]
      }
      const envelope = new bot.Envelope({
        payload: { attachments: [attachment] }
      })
      const result = rc.parseEnvelope(envelope)
      expect(result[0].attachments[0]).to.deep.include(attachment)
    })
  })
  it('accepts custom attachments', async () => {
    const envelope = new bot.Envelope()
    const custom = {
      attachments: [{
        foo: 'foo',
        bar: { baz: 'qux' }
      }]
    }
    envelope.payload.custom(custom)
    const result = rc.parseEnvelope(envelope)
    expect(result[0]).to.deep.include(custom)
  })
})
