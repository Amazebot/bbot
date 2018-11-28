import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '.'

let message: bot.message.Text
let stubs: { [key: string]: sinon.SinonStub }
const uId = 'test-user'

describe('[state]', () => {
  before(() => {
    stubs = {}
    message = bot.message.text(bot.user.create({ id: uId }), 'foo')
  })
  describe('State', () => {
    it('provides access to bot properties', () => {
      const b = bot.state.create({ message })
      expect(b.bot).to.include.all.keys(Object.keys(bot))
    })
    it('accepts extra attributes', () => {
      const b = bot.state.create({ message, foo: 'bar' })
      expect(b.foo).to.equal('bar')
    })
  })
  describe('.finish', () => {
    it('updates done status', () => {
      const b = bot.state.create({ message })
      b.finish()
      expect(b.done).to.equal(true)
    })
  })
  describe('.setBranch', () => {
    it('starts collection of matching branches', () => {
      const b = bot.state.create({ message })
      const branch = new bot.branch.Custom(() => true, () => null)
      branch.matched = true
      b.setBranch(branch)
      expect(b.branches).to.eql([branch])
    })
    it('adds to collection if existing matched branches', () => {
      const b = bot.state.create({ message })
      const branchA = new bot.branch.Custom(() => true, () => null)
      const branchB = new bot.branch.Custom(() => true, () => null)
      branchA.matched = true
      branchB.matched = true
      b.branches = [branchA]
      b.setBranch(branchB)
      expect(b.branches).to.eql([branchA, branchB])
    })
    it('rejects branches that did not match', () => {
      const b = bot.state.create({ message })
      const branch = new bot.branch.Custom(() => true, () => null)
      b.setBranch(branch)
      expect(typeof b.branches).to.equal('undefined')
    })
  })
  describe('.getBranch', () => {
    it('returns undefined when no branches in state', () => {
      const b = bot.state.create({ message })
      expect(typeof b.getBranch()).to.equal('undefined')
    })
    it('returns undefined when given ID not in state', () => {
      const b = bot.state.create({ message })
      const branch = new bot.branch.Custom(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch('B')).to.equal(undefined)
    })
    it('returns undefined when given index not in state', () => {
      const b = bot.state.create({ message })
      const branch = new bot.branch.Custom(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch(1)).to.equal(undefined)
    })
    it('returns branch by ID in state', () => {
      const b = bot.state.create({ message })
      const branch = new bot.branch.Custom(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch('A')).to.eql(branch)
    })
    it('returns branch by index in state', () => {
      const b = bot.state.create({ message })
      const branch = new bot.branch.Custom(() => 'A', () => null, { id: 'A' })
      b.branches = [branch]
      expect(b.getBranch(0)).to.eql(branch)
    })
  })
  describe('.match', () => {
    it('returns match of last branch', async () => {
      const branches = [
        new bot.branch.Custom(() => 'A', () => null, { id: 'A', force: true }),
        new bot.branch.Custom(() => 'B', () => null, { id: 'B', force: true })
      ]
      const b = bot.state.create({ message })
      for (let branch of branches) await branch.process(b, new bot.middleware.Middleware('test'))
      expect(b.match).to.eql('B')
    })
    it('returns undefined if nothing matched', () => {
      const b = bot.state.create({ message })
      expect(typeof b.match).to.equal('undefined')
    })
  })
  describe('.matched', () => {
    it('returns true if any branches added', () => {
      const b = bot.state.create({ message })
      b.branches = [new bot.branch.Custom(() => 'B', () => null)]
      expect(b.matched).to.equal(true)
    })
    it('returns false if no branches added', () => {
      const b = bot.state.create({ message })
      expect(b.matched).to.equal(false)
    })
  })
  describe('.user', () => {
    it('returns user from memory', () => {
      bot.user.byId(uId, { foo: 'bar' })
      const b = bot.state.create({ message })
      expect(b.user).to.have.property('foo', 'bar')
    })
    it('updates apply to user in memory', () => {
      bot.user.byId(uId, { foo: 'bar' })
      const b = bot.state.create({ message })
      b.user.baz = 'qux'
      expect(bot.user.byId(uId)).to.have.property('baz', 'qux')
    })
  })
  describe('.respondEnvelope', () => {
    it('returns existing envelope if not yet responded', () => {
      const b = bot.state.create({ message })
      b.envelopes = []
      b.envelopes.push(bot.envelope.create())
      b.envelopes.push(bot.envelope.create())
      b.envelopes[0].responded = Date.now()
      expect(b.respondEnvelope()).to.eql(b.envelopes[1])
    })
    it('creates new envelope from options, state, defaults', () => {
      const b = bot.state.create({ message })
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
    beforeEach(() => stubs.respond = sinon.stub(bot.thought, 'respond'))
    afterEach(() => stubs.respond.restore())
    it('calls respond thought process with the current state', async () => {
      const b = bot.state.create({ message })
      await b.respond('testing')
      sinon.assert.calledWith(stubs.respond, b)
      expect(b.envelopes![0].strings).to.eql(['testing'])
    })
  })
  describe('.respondVia', () => {
    it('updates state method before calling respond', async () => {
      const b = bot.state.create({ message })
      const respond = sinon.stub(b, 'respond')
      await b.respondVia('reply', 'hey you')
      sinon.assert.calledOnce(respond)
      expect(b.envelopes![0].method).to.equal('reply')
    })
  })
})
