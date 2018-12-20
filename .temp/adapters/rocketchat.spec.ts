import 'mocha'
import { expect } from 'chai'

import bBot from '../../src/bot'

import { Rocketchat, use } from './rocketchat'
import config from '../../src/util/config'

describe.skip('[rocketchat]', () => {
  describe('.use', () => {
    it('returns adapter instance', () => {
      const rc = use(bBot)
      expect(rc).to.be.instanceof(Rocketchat)
    })
    it('sets bot name from rocketchat bot user config', () => {
      delete process.env.DB_URL
      config.set('name', 'mongo-test')
      adapter = use(bBot)
    })
  })
  describe('.parseEnvelope', () => {
    it('accepts attachments preformed for Rocket.Chat', () => {
      const rc = use(bBot)
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
      const envelope = rc.bot.envelopes.create({
        payload: { attachments: [attachment] }
      })
      const result = envelope.createPayload(envelope)
      expect(result[0].attachments[0]).to.deep.include(attachment)
    })
  })
  it('accepts custom attachments', async () => {
    const envelope = bBot.envelopes.create()
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
