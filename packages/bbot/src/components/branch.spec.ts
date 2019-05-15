import 'mocha'
import * as sinon from 'sinon'
import { expect, assert } from 'chai'

import config from '../util/config'
import users from './user'
import { messages, Message } from './message'
import { NLU } from './nlu'
import middlewares from './middleware'
import { Conditions } from './condition'
import { State, ICallback } from './state'
import { bits } from './bit'
import {
  Branch,
  CustomBranch,
  IBranch,
  TextBranch,
  TextDirectBranch,
  NLUBranch,
  NLUDirectBranch,
  ServerBranch,
  directPattern,
  directPatternCombined,
  BranchController
} from './branch'

const user = users.create({ id: 'TEST_ID', name: 'testy' })
const message = messages.text(user, 'test')
const middleware = middlewares.create('mock')
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

class MockBranch extends Branch {
  async matcher (message: Message) {
    return /test/.test(message.toString())
  }
}

class BoolBranch extends Branch {
  constructor (
    public result: boolean,
    callback: ICallback,
    options?: IBranch
  ) {
    super(callback, options)
  }
  async matcher () {
    return this.result
  }
}

describe('[branch]', () => {
  describe('Branch', () => {
    it('accepts and stores callback function', () => {
      const callback = sinon.spy()
      const branch = new MockBranch(callback)
      expect(branch.callback).to.eql(callback)
    })
    it('accepts bit ID to create callback', () => {
      const bitBranch = new MockBranch('BIT_ID')
      expect(bitBranch.callback).to.be.a('function')
    })
    it('accepts additional properties as options', () => {
      const metaBranch = new MockBranch(() => null, { foo: 'bar' })
      expect(metaBranch.foo).to.equal('bar')
    })
    it('assigns an ID counter', () => {
      const noIdBranch = new MockBranch(() => null)
      expect(noIdBranch.id).to.match(/branch_\d/)
    })
    it('accepts an ID in meta', () => {
      const idBranch = new MockBranch(() => null, { id: 'TEST_ID' })
      expect(idBranch.id).to.equal('TEST_ID')
    })
    describe('.execute', () => {
      beforeEach(() => middleware.stack.splice(0, middleware.stack.length))
      it('calls matcher with message from state', async () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        const matcher = sinon.spy(branch, 'matcher')
        await branch.execute(b, middleware)
        sinon.assert.calledWith(matcher, b.message)
        matcher.restore()
      })
      it('executes middleware if given', async () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        await branch.execute(b, middleware)
        sinon.assert.calledOnce(execute)
        execute.restore()
      })
      it('executes only once by default', async () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        await branch.execute(b, middleware)
        await branch.execute(b, middleware)
        sinon.assert.calledOnce(execute)
        execute.restore()
      })
      it('executes multiple times when forced', async () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        branch.force = true
        await branch.execute(b, middleware)
        await branch.execute(b, middleware)
        sinon.assert.calledTwice(execute)
        execute.restore()
      })
      it('executes when forced, after prior branch fails', async () => {
        const b = new State({ message })
        let executed: string[] = []
        const A = new BoolBranch(true, () => executed.push('A'))
        const B = new BoolBranch(false, () => executed.push('B'))
        const C = new BoolBranch(true, () => executed.push('C'), { force: true })
        await A.execute(b, middleware)
        await B.execute(b, middleware)
        await C.execute(b, middleware)
        expect(executed).to.eql(['A', 'C'])
      })
      it('executes bit if ID used as callback', async () => {
        const b = new State({ message })
        const callback = sinon.spy()
        bits.setup({ id: 'listen-test', callback })
        const bitBranch = new MockBranch('listen-test')
        await bitBranch.execute(b, middleware)
        sinon.assert.calledOnce(callback)
      })
      it('gives state to middleware pieces', async () => {
        const b = new State({ message })
        const piece = sinon.spy()
        middleware.register(piece)
        const branch = new MockBranch(() => null)
        await branch.execute(b, middleware)
        sinon.assert.calledWith(piece, b)
      })
      it('calls done with match status if given', async () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        const done = sinon.spy()
        await branch.execute(b, middleware, done)
        sinon.assert.calledWith(done, true)
      })
      it('calls done even when unmatched', async () => {
        const done = sinon.spy()
        const badB = new State({ message: messages.text(user, 'no match') })
        const branch = new MockBranch(() => null)
        await branch.execute(badB, middleware, done)
        sinon.assert.calledWith(done, false)
      })
      it('if done returns promise, execute waits for resolution', async () => {
        let done: number = 0
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        await branch.execute(b, middleware, () => {
          done = Date.now()
          return delay(20)
        })
        expect(Date.now()).to.be.gte(done)
      })
      it('if middleware rejected, done is called with false', () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        const badMiddleware = middlewares.create('fail')
        badMiddleware.register(() => {
          throw new Error('(╯°□°）╯︵ ┻━┻')
        })
        return branch.execute(b, badMiddleware, (result) => {
          expect(result).to.equal(false)
        })
      })
      it('state is changed by reference', async () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        await branch.execute(b, middleware)
        expect(b.matched).to.equal(true)
      })
      it('consecutive branches share state changes', async () => {
        const b = new State({ message })
        const branch = new MockBranch(() => null)
        branch.force = true
        middleware.register((b) => {
          b.modified = (!b.modified) ? 1 : b.modified + 1
        })
        await branch.execute(b, middleware)
        await branch.execute(b, middleware)
        expect(b.modified).to.equal(2)
      })
      it('state collects matching branches and match results', async () => {
        const b = new State({ message: messages.text(user, 'foo') })
        const branches = [
          new CustomBranch(() => 1, (b) => {
            expect(b.match).to.equal(1)
          }, { id: 'A', force: true }),
          new CustomBranch(() => 2, (b) => {
            expect(b.match).to.equal(2)
          }, { id: 'B', force: true }),
          new CustomBranch(() => 3, (b) => {
            expect(b.match).to.equal(3)
          }, { id: 'C', force: true })
        ]
        for (let branch of branches) await branch.execute(b, middleware)
        expect(b.match).to.equal(3)
        expect(b.matched).to.equal(true)
      })
    })
  })
  describe('TextBranch', () => {
    it('.execute adds matcher result to state', async () => {
      const branch = new TextBranch(/foo/, () => null)
      const text = 'foo'
      const b = new State({ message: messages.text(user, text) })
      await branch.execute(b, middleware)
      expect(b.match).to.eql('foo'.match(/foo/))
    })
    it('.execute adds condition match results to state', async () => {
      const conditions = [{ starts: 'foo' }, { ends: 'bar' }]
      const text = 'foo bar'
      const b = new State({ message: messages.text(user, text) })
      const branch = new TextBranch(conditions, () => null)
      await branch.execute(b, middleware)
      expect(b.conditions.success).to.equal(true)
    })
    it('.execute adds condition captures to branch in state', async () => {
      const conditions = { door: { after: 'door number', range: '1-3' } }
      const text = 'door number 3'
      const b = new State({ message: messages.text(user, text) })
      const branch = new TextBranch(conditions, () => null)
      await branch.execute(b, middleware)
      expect(b.conditions.captured).to.eql({ door: '3' })
    })
    it('.execute branch with pre-constructed conditions', async () => {
      const conditions = new Conditions({
        they: { contains: [`they're`, `their`, 'they'] }
      }, {
        ignorePunctuation: true
      })
      const text = `they're about ready aren't they`
      const b = new State({ message: messages.text(user, text) })
      const branch = new TextBranch(conditions, () => null)
      await branch.execute(b, middleware)
      expect(b.conditions.captured).to.eql({ they: `they're` })
    })
    it('.execute unmatched if condition match falsy', async () => {
      const conditions = {
        question: { ends: '?' },
        not: { starts: 'not' }
      }
      const text = `not a question!`
      const b = new State({ message: messages.text(user, text) })
      const branch = new TextBranch(conditions, () => null)
      await branch.execute(b, middleware)
      expect(typeof b.conditions).to.equal('undefined')
      assert.notOk(b.match)
    })
  })
  describe('TextDirectBranch', () => {
    it('.execute returns match if bot name prefixed', () => {
      const direct = new TextDirectBranch(/foo/, (b) => {
        expect(b.match).to.eql('foo'.match(/foo/))
      })
      return direct.execute(new State({
        message: messages.text(user, `${config.get('name')} foo`)
      }), middleware)
    })
    it('.execute returns match on consecutive direct branch', async () => {
      const directFoo = new TextDirectBranch(/foo/, () => null)
      const directBar = new TextDirectBranch(/bar/, () => null)
      const b = new State({
        message: messages.text(user, `${config.get('name')} bar`)
      })
      await directFoo.execute(b, middleware)
      await directBar.execute(b, middleware)
      expect(b.matchingBranches).to.eql([directBar])
    })
    it('.execute adds condition match results to state', () => {
      const conditions = [{ starts: 'foo' }, { ends: 'bar' }]
      const branch = new TextDirectBranch(conditions, (b) => {
        expect(b.match).to.equal(true)
        expect(b.conditions.matches).to.eql({
          0: /^foo/.exec('foo bar'),
          1: /bar$/.exec('foo bar')
        })
      })
      return branch.execute(new State({
        message: messages.text(user, `${config.get('name')} foo bar`)
      }), middleware)
    })
  })
  describe('CustomBranch', () => {
    it('.execute runs custom matcher', async () => {
      const fooMatcher = sinon.spy((message: Message) => {
        return /foo/.test(message.toString())
      })
      const fooBranch = new CustomBranch(fooMatcher, () => null)
      await fooBranch.execute(new State({
        message: messages.text(user, 'foo')
      }), middleware)
      sinon.assert.calledOnce(fooMatcher)
    })
    it('.execute resolves state with async matcher result', async () => {
      const asyncMatcher = async () => {
        await delay(20)
        return 'delayed'
      }
      const asyncBranch = new CustomBranch(asyncMatcher, () => null)
      const result = await asyncBranch.execute(new State({
        message: messages.text(user, '')
      }), middleware)
      expect(result.match).to.equal('delayed')
    })
  })
  describe('NLUBranch', () => {
    it('.execute returns state with truthy match for matching results', async () => {
      const nluBranch = new NLUBranch({
        intent: { id: 'foo' }
      }, (state) => {
        expect(state.match).to.eql({
          intent: [{ id: 'foo', name: 'Test Foo' }]
        })
      })
      const message = messages.text(user, 'foo')
      message.nlu = new NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.execute(new State({ message }), middleware)
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.execute returns state with falsy match if below score threshold', async () => {
      const nluBranch = new NLUBranch({
        intent: { id: 'foo', score: .8 }
      }, () => null)
      const message = messages.text(user, 'foo')
      message.nlu = new NLU().addResult('intent', { id: 'foo', score: .7 })
      const b = await nluBranch.execute(new State({ message }), middleware)
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('NLUDirectBranch', () => {
    it('.execute returns true for matches with bot prefix', async () => {
      const nluBranch = new NLUDirectBranch({
        intent: { id: 'foo' }
      }, () => null)
      const message = messages.text(user, `${config.get('name')} foo`)
      message.nlu = new NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.execute(new State({ message }), middleware)
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.execute returns false for message without bot prefixed', async () => {
      const nluBranch = new NLUDirectBranch({
        intent: { id: 'foo' }
      }, () => null)
      const message = messages.text(user, `foo`)
      message.nlu = new NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.execute(new State({ message }), middleware)
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('ServerBranch', () => {
    it('.matcher matches on empty criteria if no data', async () => {
      const reqBranch = new ServerBranch({}, () => null)
      const reqMessage = messages.server({ userId: '111' })
      expect(await reqBranch.matcher(reqMessage)).to.eql({})
    })
    it('.matcher matches on property at attribute', async () => {
      const reqBranch = new ServerBranch({
        foo: 'bar'
      }, () => null)
      const reqMessage = messages.server({
        data: { foo: 'bar' },
        userId: '111',
        roomId: 'test'
      })
      expect(await reqBranch.matcher(reqMessage)).to.eql({
        foo: 'bar'
      })
    })
  })
  it('.matcher fails on wrong property at attribute', async () => {
    const reqBranch = new ServerBranch({
      foo: 'bar'
    }, () => null)
    const reqMessage = messages.server({
      data: { foo: 'baz' },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql(undefined)
  })
  it('.matcher matches on property at path', async () => {
    const reqBranch = new ServerBranch({
      'foo.bar.baz': 'qux'
    }, () => null)
    const reqMessage = messages.server({
      data: { foo: { bar: { baz: 'qux' } } },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql({ 'foo.bar.baz': 'qux' })
  })
  it('.matcher matches on property matching expression', async () => {
    const reqBranch = new ServerBranch({
      foo: /b.r/i
    }, () => null)
    const reqMessage = messages.server({
      data: { foo: 'BAR' },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql({ 'foo': /b.r/i.exec('BAR') })
  })
  describe('.directPattern', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = directPattern()
      expect(direct.toString()).to.include(config.get('name'))
    })
    it('matches when bot name is prefixed', async () => {
      const direct = directPattern()
      expect(direct.test(`${config.get('name')} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed', async () => {
      config.set('alias', 'foo')
      const direct = directPattern()
      expect(direct.test(`${config.get('alias')} test`)).to.equal(true)
      config.reset()
    })
    it('matches when bot alias is prefixed with @ symbol', async () => {
      const direct = directPattern()
      expect(direct.test(`@${config.get('name')} test`)).to.equal(true)
    })
    it('does not match unless bot name is prefixed', async () => {
      const direct = directPattern()
      expect(direct.test(`test`)).to.equal(false)
    })
  })
  describe('.directPatterCombined', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = directPatternCombined(/test/)
      expect(direct.toString()).to.include(config.get('name')).and.include('test')
    })
    it('does not match on name unless otherwise matched', () => {
      const direct = directPatternCombined(/test/)
      expect(direct.test(`${config.get('name')}`)).to.equal(false)
    })
  })
  describe('BranchController', () => {
    describe('.text', () => {
      it('adds text branch to listen collection, returning ID', () => {
        const branches = new BranchController()
        const id = branches.text(/test/, () => null)
        expect(branches.listen[id]).to.be.instanceof(TextBranch)
      })
    })
    describe('.direct', () => {
      it('adds direct text branch to listen collection, returning ID', () => {
        const branches = new BranchController()
        const id = branches.direct(/test/, () => null)
        expect(branches.listen[id]).to.be.instanceof(TextBranch)
      })
    })
    describe('.custom', () => {
      it('adds custom branch to listen collection, returning ID', () => {
        const branches = new BranchController()
        const id = branches.custom(() => null, () => null)
        expect(branches.listen[id]).to.be.instanceof(CustomBranch)
      })
    })
    describe('.NLU', () => {
      it('adds NLU branch to understand collection, returning ID', () => {
        const branches = new BranchController()
        const id = branches.NLU({ intent: { id: 'test' } }, () => null)
        expect(branches.understand[id]).to.be.instanceof(NLUBranch)
      })
    })
    describe('.directNLU', () => {
      it('adds NLU direct branch to NLU collection, returning ID', () => {
        const branches = new BranchController()
        const id = branches.directNLU({ intent: { id: 'test' } }, () => null)
        expect(branches.understand[id]).to.be.instanceof(NLUDirectBranch)
      })
    })
    describe('.customNLU', () => {
      it('adds custom branch to NLU collection, returning ID', () => {
        const branches = new BranchController()
        const id = branches.customNLU(() => null, () => null)
        expect(branches.understand[id]).to.be.instanceof(CustomBranch)
      })
      it('.execute calls callback on matching message', async () => {
        const branches = new BranchController()
        const callback = sinon.spy()
        const message = messages.text(user, 'testing custom NLU')
        const id = branches.customNLU(() => true, callback, { id: 'test-custom-nlu' })
        await branches.understand[id].execute(new State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.enter', () => {
      it('.execute calls callback on enter messages', async () => {
        const branches = new BranchController()
        const callback = sinon.spy()
        const message = messages.enter(user)
        const id = branches.enter(callback)
        await branches.listen[id].execute(new State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.leave', () => {
      it('.execute calls callback on leave messages', async () => {
        const branches = new BranchController()
        const callback = sinon.spy()
        const message = messages.leave(user)
        const id = branches.leave(callback)
        await branches.listen[id].execute(new State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.topic', () => {
      it('.execute calls callback on topic messages', async () => {
        const branches = new BranchController()
        const callback = sinon.spy()
        const message = messages.topic(user)
        const id = branches.topic(callback)
        await branches.listen[id].execute(new State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.catchAll', () => {
      it('.execute calls callback on catchAll messages', async () => {
        const branches = new BranchController()
        const callback = sinon.spy()
        const message = messages.catchAll(messages.text(user, ''))
        const id = branches.catchAll(callback)
        await branches.act[id].execute(new State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.server', () => {
      it('.execute calls callback on matching server message', async () => {
        const branches = new BranchController()
        const callback = sinon.spy()
        const message = messages.server({ userId: user.id, data: {
          foo: 'bar'
        } })
        const id = branches.server({ foo: 'bar' }, callback)
        await branches.serve[id].execute(new State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.reset', () => {
      it('clears all branches from collections', () => {
        const branches = new BranchController()
        branches.text(/.*/, () => null)
        branches.NLU({}, () => null)
        branches.catchAll(() => null)
        branches.reset()
        expect(branches.listen).to.eql({})
        expect(branches.understand).to.eql({})
        expect(branches.act).to.eql({})
      })
    })
    describe('.forced', () => {
      it('clears all but the forced branches from given collection', () => {
        const branches = new BranchController()
        branches.text(/.*/, () => null, { id: 'A' })
        branches.text(/.*/, () => null, { id: 'B' })
        branches.text(/.*/, () => null, { id: 'C', force: true })
        const len = branches.forced('listen')
        expect(len).to.equal(1)
        expect(Object.keys(branches.listen)).to.eql(['C'])
      })
    })
  })
})
