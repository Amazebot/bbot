import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { users } from './user'
import { messages, TextMessage } from './message'
import thoughts from './thought'
import middlewares from './middleware'
import { State } from './state'
import { CustomBranch } from './branch'
import { Envelope } from './envelope'
import { Bot } from '../bot'

let message: TextMessage
let stubs: { [key: string]: sinon.SinonStub }
const uId = 'mock-user'

describe('[state]', () => {
  before(() => {
    stubs = {}
    message = messages.text(users.create({ id: uId }), 'foo')
  })
  describe('State', () => {
    it('provides access to bot instance', () => {
      const b = new State({ message })
      expect(b.bot).to.be.instanceOf(Bot)
    })
    it('accepts extra attributes', () => {
      const b = new State({ message, foo: 'bar' })
      expect(b.foo).to.equal('bar')
    })
  })
  describe('.finish', () => {
    it('updates done status', () => {
      const b = new State({ message })
      b.finish()
      expect(b.done).to.equal(true)
    })
  })
  describe('.setMatchingBranch', () => {
    it('starts collection of matching branches', () => {
      const b = new State({ message })
      const branch = new CustomBranch(() => true, () => null)
      branch.matched = true
      b.setMatchingBranch(branch)
      expect(b.matching).to.eql([branch])
    })
    it('adds to collection if existing matched branches', () => {
      const b = new State({ message })
      const branchA = new CustomBranch(() => true, () => null)
      const branchB = new CustomBranch(() => true, () => null)
      branchA.matched = true
      branchB.matched = true
      b.matching = [branchA]
      b.setMatchingBranch(branchB)
      expect(b.matching).to.eql([branchA, branchB])
    })
    it('rejects branches that did not match', () => {
      const b = new State({ message })
      const branch = new CustomBranch(() => true, () => null)
      b.setMatchingBranch(branch)
      expect(typeof b.matching).to.equal('undefined')
    })
  })
  describe('.getMatchingBranch', () => {
    it('returns undefined when no branches in state', () => {
      const b = new State({ message })
      expect(typeof b.getMatchingBranch()).to.equal('undefined')
    })
    it('returns undefined when given ID not in state', () => {
      const b = new State({ message })
      const branch = new CustomBranch(() => 'A', () => null, { id: 'A' })
      b.matching = [branch]
      expect(b.getMatchingBranch('B')).to.equal(undefined)
    })
    it('returns undefined when given index not in state', () => {
      const b = new State({ message })
      const branch = new CustomBranch(() => 'A', () => null, { id: 'A' })
      b.matching = [branch]
      expect(b.getMatchingBranch(1)).to.equal(undefined)
    })
    it('returns branch by ID in state', () => {
      const b = new State({ message })
      const branch = new CustomBranch(() => 'A', () => null, { id: 'A' })
      b.matching = [branch]
      expect(b.getMatchingBranch('A')).to.eql(branch)
    })
    it('returns branch by index in state', () => {
      const b = new State({ message })
      const branch = new CustomBranch(() => 'A', () => null, { id: 'A' })
      b.matching = [branch]
      expect(b.getMatchingBranch(0)).to.eql(branch)
    })
  })
  describe('.match', () => {
    it('returns match of last branch', async () => {
      const branches = [
        new CustomBranch(() => 'A', () => null, { id: 'A', force: true }),
        new CustomBranch(() => 'B', () => null, { id: 'B', force: true })
      ]
      const b = new State({ message })
      for (let branch of branches) await branch.process(b, middlewares.create('test'))
      expect(b.match).to.eql('B')
    })
    it('returns undefined if nothing matched', () => {
      const b = new State({ message })
      expect(typeof b.match).to.equal('undefined')
    })
  })
  describe('.matched', () => {
    it('returns true if any branches added', () => {
      const b = new State({ message })
      b.matching = [new CustomBranch(() => 'B', () => null)]
      expect(b.matched).to.equal(true)
    })
    it('returns false if no branches added', () => {
      const b = new State({ message })
      expect(b.matched).to.equal(false)
    })
  })
  describe('.user', () => {
    it('returns user from memory', () => {
      users.byId(uId, { foo: 'bar' })
      const b = new State({ message })
      expect(b.user).to.have.property('foo', 'bar')
    })
    it('updates apply to user in memory', () => {
      users.byId(uId, { foo: 'bar' })
      const b = new State({ message })
      b.user.baz = 'qux'
      expect(users.byId(uId)).to.have.property('baz', 'qux')
    })
  })
  describe('.respondEnvelope', () => {
    it('returns existing envelope if not yet responded', () => {
      const b = new State({ message })
      b.envelopes = []
      b.envelopes.push(new Envelope())
      b.envelopes.push(new Envelope())
      b.envelopes[0].responded = Date.now()
      expect(b.respondEnvelope()).to.eql(b.envelopes[1])
    })
    it('creates new envelope from options, state, defaults', () => {
      const b = new State({ message })
      b.respondEnvelope({ strings: ['hello'] })
      expect(b.envelopes![0]).to.deep.include({
        message,
        room: message.user.room,
        strings: ['hello'],
        method: 'send'
      })
    })
  })
  describe('.respond', () => {
    beforeEach(() => stubs.respond = sinon.stub(thoughts, 'respond'))
    afterEach(() => stubs.respond.restore())
    it('calls respond thought process with the current state', async () => {
      const b = new State({ message })
      await b.respond('testing')
      sinon.assert.calledWith(stubs.respond, b)
      expect(b.envelopes![0].strings).to.eql(['testing'])
    })
  })
  describe('.respondVia', () => {
    it('updates state method before calling respond', async () => {
      const b = new State({ message })
      const respond = sinon.stub(b, 'respond')
      await b.respondVia('reply', 'hey you')
      sinon.assert.calledOnce(respond)
      expect(b.envelopes![0].method).to.equal('reply')
    })
  })
})
