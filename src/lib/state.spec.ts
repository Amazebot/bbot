import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as state from './state'
import * as bot from '..'

let listener: bot.TextListener
let message: bot.TextMessage
let stubs: { [key: string]: sinon.SinonStub }

describe('state', () => {
  before(() => {
    stubs = {}
    listener = new bot.TextListener(/.*/, () => null)
    message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
  })
  describe('B', () => {
    it('provides access to bot properties', () => {
      const b = new state.B({ message, listener })
      expect(b.bot).to.include.all.keys(Object.keys(bot))
    })
    it('accepts extra attributes', () => {
      const b = new state.B({ message, foo: 'bar' })
      expect(b.foo).to.equal('bar')
    })
  })
  describe('.finish', () => {
    it('updates done status', () => {
      const b = new state.B({ message, listener })
      b.finish()
      expect(b.done).to.equal(true)
    })
  })
  describe('.respondEnvelope', () => {
    it('creates new envelope from options, state, defaults', () => {
      const b = new state.B({ message, listener })
      b.respondEnvelope({ strings: ['hello'] })
      expect(b.envelope).to.deep.include({
        message,
        room: message.user.room,
        strings: ['hello'],
        method: 'send'
      })
    })
  })
  describe('respond', () => {
    beforeEach(() => stubs.respond = sinon.stub(bot.thoughts, 'respond'))
    afterEach(() => stubs.respond.restore())
    it('calls respond thought process with the current state', () => {
      const b = new state.B({ message, listener })
      b.respond('testing')
      sinon.assert.calledWith(stubs.respond, b)
    })
  })
  describe('respondVia', () => {
    it('updates state method before calling respond', () => {
      const b = new state.B({ message, listener })
      const respond = sinon.stub(b, 'respond')
      b.respondVia('reply', 'hey you')
      expect(b.envelope.method).to.equal('reply')
      sinon.assert.calledOnce(respond)
    })
  })
})
