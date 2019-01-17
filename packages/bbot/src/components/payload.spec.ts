import 'mocha'
import { expect } from 'chai'

import { Payload } from './payload'

describe('[payload]', () => {
  describe('Payload', () => {
    describe('constructor', () => {
      it('populates payload with given attachments', () => {
        const payload = new Payload({ attachments: [{
          fallback: 'foo'
        }] })
        expect(payload.attachments![0]).to.eql({
          fallback: 'foo'
        })
      })
      it('populates payload with given actions', () => {
        const payload = new Payload({ actions: [{
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
        const payload = new Payload({ quickReplies: [{ text: 'Foo' }] })
        expect(payload.quickReplies![0]).to.eql({
          text: 'Foo',
          content: 'Foo',
          type: 'button'
        })
      })
    })
    describe('.custom', () => {
      it('allows adding any custom attributes', () => {
        const payload = new Payload()
        const custom = {
          foo: 'foo',
          bar: { baz: 'qux' }
        }
        payload.custom(custom)
        expect(payload).to.eql(custom)
      })
      it('can add attributes with schema conflict', () => {
        const payload = new Payload()
        payload.custom({ title: 'My Title' })
        expect(payload).to.have.property('title', 'My Title')
      })
    })
  })
})
