import 'mocha'
import sinon from 'sinon'
import { expect, assert } from 'chai'
import * as bot from '.'

const user = bot.user.create({ id: 'TEST_ID', name: 'testy' })
const message = bot.message.text(user, 'test')
const middleware = bot.middleware.create('mock')
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
class MockBranch extends bot.branch.Branch {
  async matcher (message: bot.message.Message) {
    return /test/.test(message.toString())
  }
}
class BoolBranch extends bot.branch.Branch {
  constructor (
    public result: boolean,
    callback: bot.state.ICallback,
    options?: bot.branch.IOptions
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
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        const matcher = sinon.spy(branch, 'matcher')
        await branch.process(b, middleware)
        sinon.assert.calledWith(matcher, b.message)
      })
      it('executes middleware if given', async () => {
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        await branch.process(b, middleware)
        sinon.assert.calledOnce(execute)
        execute.restore()
      })
      it('executes only once by default', async () => {
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        await branch.process(b, middleware)
        await branch.process(b, middleware)
        sinon.assert.calledOnce(execute)
        execute.restore()
      })
      it('executes multiple times when forced', async () => {
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        const execute = sinon.spy(middleware, 'execute')
        branch.force = true
        await branch.process(b, middleware)
        await branch.process(b, middleware)
        sinon.assert.calledTwice(execute)
        execute.restore()
      })
      it('executes when forced, after prior branch fails', async () => {
        const b = bot.state.create({ message })
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
        const b = bot.state.create({ message })
        const callback = sinon.spy()
        bot.bit.setup({ id: 'listen-test', callback: callback })
        const bitBranch = new MockBranch('listen-test')
        await bitBranch.process(b, middleware)
        sinon.assert.calledOnce(callback)
      })
      it('gives state to middleware pieces', async () => {
        const b = bot.state.create({ message })
        const piece = sinon.spy()
        middleware.register(piece)
        const branch = new MockBranch(() => null)
        await branch.process(b, middleware)
        sinon.assert.calledWith(piece, b)
      })
      it('calls done with match status if given', async () => {
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        const done = sinon.spy()
        await branch.process(b, middleware, done)
        sinon.assert.calledWith(done, true)
      })
      it('calls done even when unmatched', async () => {
        const done = sinon.spy()
        const badB = bot.state.create({ message: bot.message.text(user, 'no match') })
        const branch = new MockBranch(() => null)
        await branch.process(badB, middleware, done)
        sinon.assert.calledWith(done, false)
      })
      it('if done returns promise, process waits for resolution', async () => {
        let done: number
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        return branch.process(b, middleware, () => {
          done = Date.now()
          return delay(20)
        }).then(() => {
          expect(Date.now()).to.be.gte(done)
        })
      })
      it('if middleware rejected, done is called with false', () => {
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        const badMiddleware = bot.middleware.create('fail')
        badMiddleware.register(() => {
          throw new Error('(╯°□°）╯︵ ┻━┻')
        })
        return branch.process(b, badMiddleware, (result) => {
          expect(result).to.equal(false)
        })
      })
      it('state is changed by reference', async () => {
        const b = bot.state.create({ message })
        const branch = new MockBranch(() => null)
        await branch.process(b, middleware)
        expect(b.matched).to.equal(true)
      })
      it('consecutive branches share state changes', async () => {
        const b = bot.state.create({ message })
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
        const b = bot.state.create({ message: bot.message.text(user, 'foo') })
        const branches = [
          new bot.branch.Custom(() => 1, (b) => {
            expect(b.match).to.equal(1)
          }, { id: 'A', force: true }),
          new bot.branch.Custom(() => 2, (b) => {
            expect(b.match).to.equal(2)
          }, { id: 'B', force: true }),
          new bot.branch.Custom(() => 3, (b) => {
            expect(b.match).to.equal(3)
          }, { id: 'C', force: true })
        ]
        for (let branch of branches) await branch.process(b, middleware)
        expect(b.match).to.equal(3)
        expect(b.matched).to.equal(true)
      })
    })
  })
  describe('Text', () => {
    it('.process adds matcher result to state', async () => {
      const branch = new bot.branch.Text(/foo/, () => null)
      const text = 'foo'
      const b = bot.state.create({ message: bot.message.text(user, text) })
      await branch.process(b, middleware)
      expect(b.match).to.eql('foo'.match(/foo/))
    })
    it('.process adds condition match results to state', async () => {
      const conditions = [{ starts: 'foo' }, { ends: 'bar' }]
      const text = 'foo bar'
      const b = bot.state.create({ message: bot.message.text(user, text) })
      const branch = new bot.branch.Text(conditions, () => null)
      await branch.process(b, middleware)
      expect(b.conditions.success).to.equal(true)
    })
    it('.process adds condition captures to branch in state', async () => {
      const conditions = { door: { after: 'door number', range: '1-3' } }
      const text = 'door number 3'
      const b = bot.state.create({ message: bot.message.text(user, text) })
      const branch = new bot.branch.Text(conditions, () => null)
      await branch.process(b, middleware)
      expect(b.conditions.captured).to.eql({ door: '3' })
    })
    it('.process branch with pre-constructed conditions', async () => {
      const conditions = bot.conditions.create({
        they: { contains: [`they're`, `their`, 'they'] }
      }, {
        ignorePunctuation: true
      })
      const text = `they're about ready aren't they`
      const b = bot.state.create({ message: bot.message.text(user, text) })
      const branch = new bot.branch.Text(conditions, () => null)
      await branch.process(b, middleware)
      expect(b.conditions.captured).to.eql({ they: `they're` })
    })
    it('.process unmatched if condition match falsy', async () => {
      const conditions = {
        question: { ends: '?' },
        not: { starts: 'not' }
      }
      const text = `not a question!`
      const b = bot.state.create({ message: bot.message.text(user, text) })
      const branch = new bot.branch.Text(conditions, () => null)
      await branch.process(b, middleware)
      expect(typeof b.conditions).to.equal('undefined')
      assert.notOk(b.match)
    })
  })
  describe('TextDirect', () => {
    it('.process returns match if bot name prefixed', () => {
      const direct = new bot.branch.TextDirect(/foo/, (b) => {
        expect(b.match).to.eql('foo'.match(/foo/))
      })
      return direct.process(bot.state.create({
        message: bot.message.text(user, `${bot.settings.get('name')} foo`)
      }), middleware)
    })
    it('.process returns match on consecutive direct branch', async () => {
      const directFoo = new bot.branch.TextDirect(/foo/, () => null)
      const directBar = new bot.branch.TextDirect(/bar/, () => null)
      const b = bot.state.create({
        message: bot.message.text(user, `${bot.settings.get('name')} bar`)
      })
      await directFoo.process(b, middleware)
      await directBar.process(b, middleware)
      expect(b.branches).to.eql([directBar])
    })
    it('.process adds condition match results to state', () => {
      const conditions = [{ starts: 'foo' }, { ends: 'bar' }]
      const branch = new bot.branch.TextDirect(conditions, (b) => {
        expect(b.match).to.equal(true)
        expect(b.conditions.matches).to.eql({
          0: /^foo/.exec('foo bar'),
          1: /bar$/.exec('foo bar')
        })
      })
      return branch.process(bot.state.create({
        message: bot.message.text(user, `${bot.settings.get('name')} foo bar`)
      }), middleware)
    })
  })
  describe('Custom', () => {
    it('.process runs custom matcher', async () => {
      const fooMatcher = sinon.spy((message: bot.message.Message) => {
        return /foo/.test(message.toString())
      })
      const fooBranch = new bot.branch.Custom(fooMatcher, () => null)
      await fooBranch.process(bot.state.create({
        message: bot.message.text(user, 'foo')
      }), middleware)
      sinon.assert.calledOnce(fooMatcher)
    })
    it('.process resolves state with async matcher result', async () => {
      const asyncMatcher = async () => {
        await delay(20)
        return 'delayed'
      }
      const asyncBranch = new bot.branch.Custom(asyncMatcher, () => null)
      const result = await asyncBranch.process(bot.state.create({
        message: bot.message.text(user, '')
      }), middleware)
      expect(result.match).to.equal('delayed')
    })
  })
  describe('NLU', () => {
    it('.process returns state with truthy match for matching results', async () => {
      const nluBranch = new bot.branch.NLU({
        intent: { id: 'foo' }
      }, (state) => {
        expect(state.match).to.eql({
          intent: [{ id: 'foo', name: 'Test Foo' }]
        })
      })
      const message = bot.message.text(user, 'foo')
      message.nlu = bot.nlu.create().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.process(bot.state.create({ message }), middleware)
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.process returns state with falsy match if below score threshold', async () => {
      const nluBranch = new bot.branch.NLU({
        intent: { id: 'foo', score: .8 }
      }, () => null)
      const message = bot.message.text(user, 'foo')
      message.nlu = bot.nlu.create().addResult('intent', { id: 'foo', score: .7 })
      const b = await nluBranch.process(bot.state.create({ message }), middleware)
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('NLUDirect', () => {
    it('.process returns true for matches with bot prefix', async () => {
      const nluBranch = new bot.branch.NLUDirect({
        intent: { id: 'foo' }
      }, () => null)
      const message = bot.message.text(user, `${bot.settings.get('name')} foo`)
      message.nlu = bot.nlu.create().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.process(bot.state.create({ message }), middleware)
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.process returns false for message without bot prefixed', async () => {
      const nluBranch = new bot.branch.NLUDirect({
        intent: { id: 'foo' }
      }, () => null)
      const message = bot.message.text(user, `foo`)
      message.nlu = bot.nlu.create().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluBranch.process(bot.state.create({ message }), middleware)
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('Server', () => {
    it('.matcher matches on empty criteria if no data', async () => {
      const reqBranch = new bot.branch.Server({}, () => null)
      const reqMessage = bot.message.server({ userId: '111' })
      expect(await reqBranch.matcher(reqMessage)).to.eql({})
    })
    it('.matcher matches on property at attribute', async () => {
      const reqBranch = new bot.branch.Server({
        foo: 'bar'
      }, () => null)
      const reqMessage = bot.message.server({
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
    const reqBranch = new bot.branch.Server({
      foo: 'bar'
    }, () => null)
    const reqMessage = bot.message.server({
      data: { foo: 'baz' },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql(undefined)
  })
  it('.matcher matches on property at path', async () => {
    const reqBranch = new bot.branch.Server({
      'foo.bar.baz': 'qux'
    }, () => null)
    const reqMessage = bot.message.server({
      data: { foo: { bar: { baz: 'qux' } } },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql({ 'foo.bar.baz': 'qux' })
  })
  it('.matcher matches on property matching expression', async () => {
    const reqBranch = new bot.branch.Server({
      foo: /b.r/i
    }, () => null)
    const reqMessage = bot.message.server({
      data: { foo: 'BAR' },
      userId: '111',
      roomId: 'test'
    })
    expect(await reqBranch.matcher(reqMessage)).to.eql({ 'foo': /b.r/i.exec('BAR') })
  })
  describe('.directPattern', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = bot.branch.directPattern()
      expect(direct.toString()).to.include(bot.settings.get('name'))
    })
    it('matches when bot name is prefixed', async () => {
      const direct = bot.branch.directPattern()
      expect(direct.test(`${bot.settings.get('name')} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed', async () => {
      const direct = bot.branch.directPattern()
      expect(direct.test(`${bot.settings.get('alias')} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed with @ symbol', async () => {
      const direct = bot.branch.directPattern()
      expect(direct.test(`@${bot.settings.get('name')} test`)).to.equal(true)
    })
    it('does not match unless bot name is prefixed', async () => {
      const direct = bot.branch.directPattern()
      expect(direct.test(`test`)).to.equal(false)
    })
  })
  describe('.directPatterCombined', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = bot.branch.directPatternCombined(/test/)
      expect(direct.toString()).to.include(bot.settings.get('name')).and.include('test')
    })
    it('does not match on name unless otherwise matched', () => {
      const direct = bot.branch.directPatternCombined(/test/)
      expect(direct.test(`${bot.settings.get('name')}`)).to.equal(false)
    })
  })
})
