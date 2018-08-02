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
    it('.process adds matcher result to state', () => {
      const fooBranch = new bot.TextBranch(/foo/, (state) => {
        expect(state.match).to.eql('foo'.match(/foo/))
      })
      return fooBranch.process(new bot.State({
        message: new bot.TextMessage(user, 'foo')
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
      const message = new bot.TextMessage(user, `${bot.name} foo`)
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
})
