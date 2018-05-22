import 'mocha'
import * as sinon from 'sinon'
import * as state from './state'
import { expect } from 'chai'
import * as bot from '..'

// Mocks for state population
const listener = new bot.TextListener(/.*/, () => null)
const message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
const stubs: { [key: string]: sinon.SinonStub } = {}

describe('state', () => {
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
  describe('.attach', () => {
    it('calls envelope attach, updating state', () => {
      const b = new state.B({ message })
      b.attach({ foo: 'bar' })
      expect(b.envelope.payload).to.eql({ foo: 'bar' })
    })
  })
  describe('.write', () => {
    it('calls envelope write, updating state', () => {
      const b = new state.B({ message })
      b.write('foo', 'bar')
      expect(b.envelope.strings).to.eql(['foo', 'bar'])
    })
  })
  describe('.compose', () => {
    it('calls envelope.write when given strings', () => {
      const b = new state.B({ message })
      const write = sinon.spy(b, 'write')
      b.compose(['foo', 'bar'])
      sinon.assert.calledWithExactly(write, 'foo')
      sinon.assert.calledWithExactly(write, 'bar')
    })
    it('calls envelope.attach when given object', () => {
      const b = new state.B({ message })
      const attach = sinon.spy(b, 'attach')
      b.compose([{ foo: 'bar' }])
      sinon.assert.calledWithExactly(attach, { foo: 'bar' })
    })
    it('calls both write and attach when given mixed args', () => {
      const b = new state.B({ message })
      const write = sinon.spy(b, 'write')
      const attach = sinon.spy(b, 'attach')
      b.compose(['foo', { foo: 'bar' }])
      sinon.assert.calledWithExactly(write, 'foo')
      sinon.assert.calledWithExactly(attach, { foo: 'bar' })
    })
  })
  describe('respond', () => {
    beforeEach(() => stubs.respond = sinon.stub(bot, 'respond'))
    afterEach(() => stubs.respond.restore())
    it('updates state method to given method name', () => {
      const b = new state.B({ message, listener })
      const compose = sinon.spy(b, 'compose')
      b.respond('reply')
      expect(b.method).to.equal('reply')
    })
    it('assumes send as default state method', () => {
      const b = new state.B({ message })
      b.respond()
      expect(b.method).to.equal('send')
    })
    it('calls bot.respond with the current state', () => {
      const b = new state.B({ message, listener })
      b.respond('test')
      sinon.assert.calledWith(stubs.respond, b)
    })
    it('calls bot.respond passing callback if given', () => {
      const b = new state.B({ message, listener })
      const callback = (err) => (err) ? console.error(err) : console.log('sent')
      b.respond('test', callback)
      sinon.assert.calledWith(stubs.respond, b)
    })
  })
})
