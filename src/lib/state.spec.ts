import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

let message: bot.TextMessage
let stubs: { [key: string]: sinon.SinonStub }

describe('[state]', () => {
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
  describe('.setBranch', () => {
    it('starts collection of matching branches', () => {
      const b = new bot.State({ message })
      const branch = new bot.CustomBranch(() => true, () => null)
      branch.matched = true
      b.setBranch(branch)
      expect(b.branches).to.eql([branch])
    })
    it('adds to collection if existing matched branches', () => {
      const b = new bot.State({ message })
      const branchA = new bot.CustomBranch(() => true, () => null)
      const branchB = new bot.CustomBranch(() => true, () => null)
      branchA.matched = true
      branchB.matched = true
      b.branches = [branchA]
      b.setBranch(branchB)
      expect(b.branches).to.eql([branchA, branchB])
    })
    it('rejects branches that did not match', () => {
      const b = new bot.State({ message })
      const branch = new bot.CustomBranch(() => true, () => null)
      b.setBranch(branch)
      expect(typeof b.branches).to.equal('undefined')
    })
  })
  describe('.getBranch', () => {
    it('returns undefined when no branches in state', () => {
      const b = new bot.State({ message })
      expect(typeof b.getBranch()).to.equal('undefined')
    })
    it('returns undefined when given ID not in state', () => {
      const b = new bot.State({ message })
      const branch = new bot.CustomBranch(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch('B')).to.equal(undefined)
    })
    it('returns undefined when given index not in state', () => {
      const b = new bot.State({ message })
      const branch = new bot.CustomBranch(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch(1)).to.equal(undefined)
    })
    it('returns branch by ID in state', () => {
      const b = new bot.State({ message })
      const branch = new bot.CustomBranch(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch('A')).to.eql(branch)
    })
    it('returns branch by index in state', () => {
      const b = new bot.State({ message })
      const branch = new bot.CustomBranch(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch(0)).to.eql(branch)
    })
  })
  describe('.match', () => {
    it('returns match of last branch', async () => {
      const branches = [
        new bot.CustomBranch(() => 'A', () => null, { id: 'A', force: true }),
        new bot.CustomBranch(() => 'B', () => null, { id: 'B', force: true })
      ]
      const b = new bot.State({ message })
      for (let branch of branches) await branch.process(b, new bot.Middleware('test'))
      expect(b.match).to.eql('B')
    })
    it('returns undefined if nothing matched', () => {
      const b = new bot.State({ message })
      expect(typeof b.match).to.equal('undefined')
    })
  })
  describe('.matched', () => {
    it('returns true if any branches added', () => {
      const b = new bot.State({ message })
      b.branches = [new bot.CustomBranch(() => 'B', () => null)]
      expect(b.matched).to.equal(true)
    })
    it('returns false if no branches added', () => {
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
      expect(b.envelopes![0]).to.deep.include({
        message,
        room: message.user.room,
        strings: ['hello'],
        method: 'send'
      })
    })
  })
  describe('.respond', () => {
    beforeEach(() => stubs.respond = sinon.stub(bot, 'respond'))
    afterEach(() => stubs.respond.restore())
    it('calls respond thought process with the current state', async () => {
      const b = new bot.State({ message })
      await b.respond('testing')
      sinon.assert.calledWith(stubs.respond, b)
      expect(b.envelopes![0].strings).to.eql(['testing'])
    })
  })
  describe('.reply', () => {
    it('prefixes all strings with @user from message', async () => {
      const b = new bot.State({ message })
      const respond = sinon.stub(b, 'respond')
      await b.reply('one', { foo: 'bar' }, 'two')
      sinon.assert.calledWithExactly(
        respond,
        '@test-user one',
        { foo: 'bar' },
        '@test-user two'
      )
    })
  })
  describe('.respondVia', () => {
    it('updates state method before calling respond', async () => {
      const b = new bot.State({ message })
      const respond = sinon.stub(b, 'respond')
      await b.respondVia('reply', 'hey you')
      sinon.assert.calledOnce(respond)
      expect(b.envelopes![0].method).to.equal('reply')
    })
  })
})
