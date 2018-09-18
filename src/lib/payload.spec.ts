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
      it('populates payload with quick reply defaults', () => {
        const payload = new bot.Payload({ quickReplies: [{ text: 'Foo' }] })
        expect(payload.quickReplies![0]).to.eql({
          text: 'Foo',
          content: 'Foo',
          type: 'button'
        })
      })
    })
    describe('.custom', () => {
      it('allows adding any custom attributes', () => {
        const payload = new bot.Payload()
        const custom = {
          foo: 'foo',
          bar: { baz: 'qux' }
        }
        payload.custom(custom)
        expect(payload).to.eql(custom)
      })
    })
  })
})
