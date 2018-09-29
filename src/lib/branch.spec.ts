import 'mocha'
import sinon from 'sinon'
import { expect, assert } from 'chai'
import * as bot from '..'

const user = new bot.User({ id: 'TEST_ID', name: 'testy' })
const message = new bot.TextMessage(user, 'test')
const middleware = new bot.Middleware('mock')
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
class MockBranch extends bot.Branch {
  async matcher (message: bot.Message) {
    return /test/.test(message.toString())
  }
}
class BoolBranch extends bot.Branch {
  constructor (
    public result: boolean,
    callback: bot.IBranchCallback,
    options?: bot.IBranch
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
    describe('.process', () => {
      beforeEach(() => middleware.stack.splice(0, middleware.stack.length))
      it('calls matcher with message from state', async () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        const matcher = sinon.spy(branch, 'matcher')
        await branch.process(b, middleware)
        sinon.assert.calledWith(matcher, b.message)
      })
      it('executes middleware if given', async () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        await branch.process(b, middleware)
        sinon.assert.calledOnce(execute)
        execute.restore()
      })
      it('executes only once by default', async () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        await branch.process(b, middleware)
        await branch.process(b, middleware)
        sinon.assert.calledOnce(execute)
        execute.restore()
      })
      it('executes multiple times when forced', async () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        branch.force = true
        await branch.process(b, middleware)
        await branch.process(b, middleware)
        sinon.assert.calledTwice(execute)
        execute.restore()
      })
      it('executes when forced, after prior branch fails', async () => {
        const b = new bot.State({ message })
        let processed: string[] = []
        const A = new BoolBranch(true, () => processed.push('A'))
        const B = new BoolBranch(false, () => processed.push('B'))
        const C = new BoolBranch(true, () => processed.push('C'), { force: true })
        await A.process(b, middleware)
        await B.process(b, middleware)
        await C.process(b, middleware)
        expect(processed).to.eql(['A', 'C'])
      })
      it('executes bit if ID used as callback', async () => {
        const b = new bot.State({ message })
        const callback = sinon.spy()
        bot.setupBit({ id: 'listen-test', callback: callback })
        const bitBranch = new MockBranch('listen-test')
        await bitBranch.process(b, middleware)
        sinon.assert.calledOnce(callback)
      })
      it('gives state to middleware pieces', async () => {
        const b = new bot.State({ message })
        const piece = sinon.spy()
        middleware.register(piece)
        const branch = new MockBranch(() => null)
        await branch.process(b, middleware)
        sinon.assert.calledWith(piece, b)
      })
      it('calls done with match status if given', async () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        const done = sinon.spy()
        await branch.process(b, middleware, done)
        sinon.assert.calledWith(done, true)
      })
      it('calls done even when unmatched', async () => {
        const done = sinon.spy()
        const badB = new bot.State({ message: new bot.TextMessage(user, 'no match') })
        const branch = new MockBranch(() => null)
        await branch.process(badB, middleware, done)
        sinon.assert.calledWith(done, false)
      })
      it('if done returns promise, process waits for resolution', async () => {
        let done: number
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        return branch.process(b, middleware, () => {
          done = Date.now()
          return delay(20)
        }).then(() => {
          expect(Date.now()).to.be.gte(done)
        })
      })
      it('if middleware rejected, done is called with false', () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        const badMiddleware = new bot.Middleware('fail')
        badMiddleware.register(() => {
          throw new Error('(╯°□°）╯︵ ┻━┻')
        })
        return branch.process(b, badMiddleware, (result) => {
          expect(result).to.equal(false)
        })
      })
      it('state is changed by reference', async () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        await branch.process(b, middleware)
        expect(b.matched).to.equal(true)
      })
      it('consecutive branches share state changes', async () => {
        const b = new bot.State({ message })
        const branch = new MockBranch(() => null)
        branch.force = true
        middleware.register((b) => {
          b.modified = (!b.modified) ? 1 : b.modified + 1
        })
        await branch.process(b, middleware)
        await branch.process(b, middleware)
        expect(b.modified).to.equal(2)
      })
      it('state collects matching branches and match results', async () => {
        const b = new bot.State({ message: new bot.TextMessage(user, 'foo') })
        const branches = [
          new bot.CustomBranch(() => 1, (b) => {
            expect(b.match).to.equal(1)
          }, { id: 'A', force: true }),
          new bot.CustomBranch(() => 2, (b) => {
            expect(b.match).to.equal(2)
          }, { id: 'B', force: true }),
          new bot.CustomBranch(() => 3, (b) => {
            expect(b.match).to.equal(3)
          }, { id: 'C', force: true })
        ]
        for (let branch of branches) await branch.process(b, middleware)
        expect(b.match).to.equal(3)
        expect(b.matched).to.equal(true)
      })
    })
  })
  describe('TextBranch', () => {
    it('.process adds matcher result to state', async () => {
      const branch = new bot.TextBranch(/foo/, () => null)
      const text = 'foo'
      const b = new bot.State({ message: new bot.TextMessage(user, text) })
      await branch.process(b, middleware)
      expect(b.match).to.eql('foo'.match(/foo/))
    })
    it('.process adds condition match results to state', async () => {
      const conditions = [{ starts: 'foo' }, { ends: 'bar' }]
      const text = 'foo bar'
      const b = new bot.State({ message: new bot.TextMessage(user, text) })
      const branch = new bot.TextBranch(conditions, () => null)
      await branch.process(b, middleware)
      expect(b.conditions.success).to.equal(true)
    })
    it('.process adds condition captures to branch in state', async () => {
      const conditions = { door: { after: 'door number', range: '1-3' } }
      const text = 'door number 3'
      const b = new bot.State({ message: new bot.TextMessage(user, text) })
      const branch = new bot.TextBranch(conditions, () => null)
      await branch.process(b, middleware)
      expect(b.conditions.captured).to.eql({ door: '3' })
    })
    it('.process branch with pre-constructed conditions', async () => {
      const conditions = new bot.Conditions({
        they: { contains: [`they're`, `their`, 'they'] }
      }, {
        ignorePunctuation: true
      })
      const text = `they're about ready aren't they`
      const b = new bot.State({ message: new bot.TextMessage(user, text) })
      const branch = new bot.TextBranch(conditions, () => null)
      await branch.process(b, middleware)
      expect(b.conditions.captured).to.eql({ they: `they're` })
    })
    it('.process unmatched if condition match falsy', async () => {
      const conditions = {
        question: { ends: '?' },
        not: { starts: 'not' }
      }
      const text = `not a question!`
      const b = new bot.State({ message: new bot.TextMessage(user, text) })
      const branch = new bot.TextBranch(conditions, () => null)
      await branch.process(b, middleware)
      expect(typeof b.conditions).to.equal('undefined')
      assert.notOk(b.match)
    })
  })
  describe('TextDirectBranch', () => {
    it('.process returns match if bot name prefixed', () => {
      const direct = new bot.TextDirectBranch(/foo/, (b) => {
        expect(b.match).to.eql('foo'.match(/foo/))
      })
      return direct.process(new bot.State({
        message: new bot.TextMessage(user, `${bot.settings.get('name')} foo`)
      }), middleware)
    })
    it('.process returns match on consecutive direct branch', async () => {
      const directFoo = new bot.TextDirectBranch(/foo/, () => null)
      const directBar = new bot.TextDirectBranch(/bar/, () => null)
      const b = new bot.State({
        message: new bot.TextMessage(user, `${bot.settings.get('name')} bar`)
      })
      await directFoo.process(b, middleware)
      await directBar.process(b, middleware)
      expect(b.branches).to.eql([directBar])
    })
    it('.process adds condition match results to state', () => {
      const conditions = [{ starts: 'foo' }, { ends: 'bar' }]
      const branch = new bot.TextDirectBranch(conditions, (b) => {
        expect(b.match).to.equal(true)
        expect(b.conditions.matches).to.eql({
          0: /^foo/.exec('foo bar'),
          1: /bar$/.exec('foo bar')
        })
      })
      return branch.process(new bot.State({
        message: new bot.TextMessage(user, `${bot.settings.get('name')} foo bar`)
      }), middleware)
    })
  })
  describe('CustomBranch', () => {
    it('.process runs custom matcher', async () => {
      const fooMatcher = sinon.spy((message: bot.Message) => {
        return /foo/.test(message.toString())
      })
      const fooBranch = new bot.CustomBranch(fooMatcher, () => null)
      await fooBranch.process(new bot.State({
        message: new bot.TextMessage(user, 'foo')
      }), middleware)
      sinon.assert.calledOnce(fooMatcher)
    })
    it('.process resolves state with async matcher result', async () => {
      const asyncMatcher = async () => {
        await delay(20)
        return 'delayed'
      }
      const asyncBranch = new bot.CustomBranch(asyncMatcher, () => null)
      const result = await asyncBranch.process(new bot.State({
        message: new bot.TextMessage(user, '')
      }), middleware)
      expect(result.match).to.equal('delayed')
    })
  })
  describe('NaturalLanguageBranch', () => {
    it('.process returns state with truthy match for matching results', async () => {
      const nluBranch = new bot.NaturalLanguageBranch({
        intent: { id: 'foo' }
      }, (state) => {
        expect(state.match).to.eql({
          intent: [{ id: 'foo', name: 'Test Foo' }]
        })
      })
      const message = new bot.TextMessage(user, 'foo')
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.process(new bot.State({ message }), middleware)
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.process returns state with falsy match if below score threshold', async () => {
      const nluBranch = new bot.NaturalLanguageBranch({
        intent: { id: 'foo', score: .8 }
      }, () => null)
      const message = new bot.TextMessage(user, 'foo')
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', score: .7 })
      const b = await nluBranch.process(new bot.State({ message }), middleware)
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('NaturalLanguageDirectBranch', () => {
    it('.process returns true for matches with bot prefix', async () => {
      const nluBranch = new bot.NaturalLanguageDirectBranch({
        intent: { id: 'foo' }
      }, () => null)
      const message = new bot.TextMessage(user, `${bot.settings.name} foo`)
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.process(new bot.State({ message }), middleware)
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.process returns false for message without bot prefixed', async () => {
      const nluBranch = new bot.NaturalLanguageDirectBranch({
        intent: { id: 'foo' }
      }, () => null)
      const message = new bot.TextMessage(user, `foo`)
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.process(new bot.State({ message }), middleware)
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('ServerBranch', () => {
    it('.matcher matches on empty criteria if no data', async () => {
      const reqBranch = new bot.ServerBranch({}, () => null)
      const reqMessage = new bot.ServerMessage({ userId: '111' })
      expect(await reqBranch.matcher(reqMessage)).to.eql({})
    })
    it('.matcher matches on property at attribute', async () => {
      const reqBranch = new bot.ServerBranch({
        foo: 'bar'
      }, () => null)
      const reqMessage = new bot.ServerMessage({
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
    const reqBranch = new bot.ServerBranch({
      foo: 'bar'
    }, () => null)
    const reqMessage = new bot.ServerMessage({
      data: { foo: 'baz' },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql(undefined)
  })
  it('.matcher matches on property at path', async () => {
    const reqBranch = new bot.ServerBranch({
      'foo.bar.baz': 'qux'
    }, () => null)
    const reqMessage = new bot.ServerMessage({
      data: { foo: { bar: { baz: 'qux' } } },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql({ 'foo.bar.baz': 'qux' })
  })
  it('.matcher matches on property matching expression', async () => {
    const reqBranch = new bot.ServerBranch({
      foo: /b.r/i
    }, () => null)
    const reqMessage = new bot.ServerMessage({
      data: { foo: 'BAR' },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql({ 'foo': /b.r/i.exec('BAR') })
  })
})
