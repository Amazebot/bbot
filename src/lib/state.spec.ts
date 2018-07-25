import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

let message: bot.TextMessage
let stubs: { [key: string]: sinon.SinonStub }

describe('state', () => {
  before(() => {
    stubs = {}
    message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
  })
  describe('State', () => {
    it('provides access to bot properties', () => {
      const b = new bot.State({ message })
      expect(b.bot).to.include.all.keys(Object.keys(bot))
    })
    it('accepts extra attributes', () => {
      const b = new bot.State({ message, foo: 'bar' })
      expect(b.foo).to.equal('bar')
    })
  })
  describe('.finish', () => {
    it('updates done status', () => {
      const b = new bot.State({ message })
      b.finish()
      expect(b.done).to.equal(true)
    })
  })
  describe('.setListener', () => {
    it('starts collection of matching listeners', () => {
      const b = new bot.State({ message })
      const listener = new bot.CustomListener(() => true, () => null)
      listener.matched = true
      b.setListener(listener)
      expect(b.listeners).to.eql([listener])
    })
    it('adds to collection if existing matched listeners', () => {
      const b = new bot.State({ message })
      const listenerA = new bot.CustomListener(() => true, () => null)
      const listenerB = new bot.CustomListener(() => true, () => null)
      listenerA.matched = true
      listenerB.matched = true
      b.listeners = [listenerA]
      b.setListener(listenerB)
      expect(b.listeners).to.eql([listenerA, listenerB])
    })
    it('rejects listeners that did not match', () => {
      const b = new bot.State({ message })
      const listener = new bot.CustomListener(() => true, () => null)
      b.setListener(listener)
      expect(typeof b.listeners).to.equal('undefined')
    })
  })
  describe('.getListener', () => {
    it('returns undefined when no listeners in state', () => {
      const b = new bot.State({ message })
      expect(typeof b.getListener()).to.equal('undefined')
    })
    it('returns undefined when given ID not in state', () => {
      const b = new bot.State({ message })
      const listener = new bot.CustomListener(() => 'A', () => null, { id: 'A' })
      b.listeners = [listener]
      expect(b.getListener('B')).to.equal(undefined)
    })
    it('returns undefined when given index not in state', () => {
      const b = new bot.State({ message })
      const listener = new bot.CustomListener(() => 'A', () => null, { id: 'A' })
      b.listeners = [listener]
      expect(b.getListener(1)).to.equal(undefined)
    })
    it('returns listener by ID in state', () => {
      const b = new bot.State({ message })
      const listener = new bot.CustomListener(() => 'A', () => null, { id: 'A' })
      b.listeners = [listener]
      expect(b.getListener('A')).to.eql(listener)
    })
    it('returns listener by index in state', () => {
      const b = new bot.State({ message })
      const listener = new bot.CustomListener(() => 'A', () => null, { id: 'A' })
      b.listeners = [listener]
      expect(b.getListener(0)).to.eql(listener)
    })
  })
  describe('.match', () => {
    it('returns match of last listener', async () => {
      const listeners = [
        new bot.CustomListener(() => 'A', () => null, { id: 'A', force: true }),
        new bot.CustomListener(() => 'B', () => null, { id: 'B', force: true })
      ]
      const b = new bot.State({ message })
      for (let listener of listeners) await listener.process(b)
      expect(b.match).to.eql('B')
    })
    it('returns undefined if nothing matched', () => {
      const b = new bot.State({ message })
      expect(typeof b.match).to.equal('undefined')
    })
  })
  describe('.matched', () => {
    it('returns true if any listeners added', () => {
      const b = new bot.State({ message })
      b.listeners = [new bot.CustomListener(() => 'B', () => null)]
      expect(b.matched).to.equal(true)
    })
    it('returns false if no listeners added', () => {
      const b = new bot.State({ message })
      expect(b.matched).to.equal(false)
    })
  })
  describe('.respondEnvelope', () => {
    it('returns existing envelope if not yet responded', () => {
      const b = new bot.State({ message })
      b.envelopes = []
      b.envelopes.push(new bot.Envelope())
      b.envelopes.push(new bot.Envelope())
      b.envelopes[0].responded = Date.now()
      expect(b.respondEnvelope()).to.eql(b.envelopes[1])
    })
    it('creates new envelope from options, state, defaults', () => {
      const b = new bot.State({ message })
      b.respondEnvelope({ strings: ['hello'] })
      expect(b.envelopes[0]).to.deep.include({
        message,
        room: message.user.room,
        strings: ['hello'],
        method: 'send'
      })
    })
  })
  describe('respond', () => {
    beforeEach(() => stubs.respond = sinon.stub(bot, 'respond'))
    afterEach(() => stubs.respond.restore())
    it('calls respond thought process with the current state', () => {
      const b = new bot.State({ message })
      b.respond('testing')
      sinon.assert.calledWith(stubs.respond, b)
      expect(b.envelopes[0].strings).to.eql(['testing'])
    })
  })
  describe('respondVia', () => {
    it('updates state method before calling respond', () => {
      const b = new bot.State({ message })
      const respond = sinon.stub(b, 'respond')
      b.respondVia('reply', 'hey you')
      sinon.assert.calledOnce(respond)
      expect(b.envelopes[0].method).to.equal('reply')
    })
  })
})
