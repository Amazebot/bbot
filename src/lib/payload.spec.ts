import 'mocha'
import { expect } from 'chai'
import * as bot from '..'

describe('[payload]', () => {
  describe('Payload', () => {
    describe('constructor', () => {
      it('populates payload with given attachments', () => {
        const payload = new bot.Payload({ attachments: [{
          fallback: 'foo'
        }] })
        expect(payload.attachments![0]).to.eql({
          fallback: 'foo'
        })
      })
      it('populates payload with given actions', () => {
        const payload = new bot.Payload({ actions: [{
          name: 'foo',
          type: 'button',
          text: 'Foo'
        }] })
        expect(payload.actions![0]).to.eql({
          name: 'foo',
          type: 'button',
          text: 'Foo'
        })
      })
      it('populates payload with given quick replies', () => {
        const payload = new bot.Payload({ quickReplies: [{
          text: 'Foo',
          content: 'foo'
        }] })
        expect(payload.quickReplies![0]).to.eql({
          text: 'Foo',
          content: 'foo'
        })
      })
    })
  })
})
