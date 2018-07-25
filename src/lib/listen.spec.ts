import 'mocha'
import sinon from 'sinon'
import { expect, assert } from 'chai'
import * as bot from '..'

let mockUser: bot.User
let b: bot.State
let middleware: bot.Middleware
let callback: sinon.SinonSpy
let matcher: sinon.SinonSpy
let piece: sinon.SinonSpy
let execute: sinon.SinonSpy
let listener: bot.Listener

const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))
class MockListener extends bot.Listener {
  async matcher (message) {
    return /test/.test(message.toString())
  }
}
class BoolListener extends bot.Listener {
  constructor (
    public result: boolean,
    callback: bot.IListenerCallback,
    options?: bot.IListener
  ) {
    super(callback, options)
  }
  async matcher () {
    return this.result
  }
}

describe('listen', () => {
  before(() => {
    mockUser = new bot.User({ id: 'TEST_ID', name: 'testy' })
  })
  describe('Listener', () => {
    beforeEach(() => {
      b = new bot.State({ message: new bot.TextMessage(mockUser, 'test') })
      callback = sinon.spy()
      piece = sinon.spy()
      middleware = new bot.Middleware('mock')
      middleware.register(piece)
      execute = sinon.spy(middleware, 'execute')
      listener = new MockListener(callback, { id: 'mock-listener' })
      matcher = sinon.spy(listener, 'matcher')
    })
    it('accepts and stores callback function', () => {
      expect(listener.callback).to.eql(callback)
    })
    it('accepts bit ID to create callback', () => {
      const bitListener = new MockListener('BIT_ID')
      expect(listener.callback).to.be.a('function')
    })
    it('accepts additional properties as options', () => {
      const metaListener = new MockListener(() => null, { foo: 'bar' })
      expect(metaListener.foo).to.equal('bar')
    })
    it('assigns an ID counter', () => {
      const noIdListener = new MockListener(() => null)
      expect(noIdListener.id).to.match(/listener_\d/)
    })
    it('accepts an ID in meta', () => {
      const idListener = new MockListener(() => null, { id: 'TEST_ID' })
      expect(idListener.id).to.equal('TEST_ID')
    })
    describe('.process', () => {
      it('calls matcher with message from state', () => {
        listener.process(b)
        sinon.assert.calledWith(matcher, b.message)
      })
      it('executes middleware if given', async () => {
        await listener.process(b, middleware)
        sinon.assert.calledOnce(execute)
      })
      it('executes only once by default', async () => {
        await listener.process(b, middleware)
        await listener.process(b, middleware)
        sinon.assert.calledOnce(execute)
      })
      it('executes multiple times when forced', async () => {
        listener.force = true
        await listener.process(b, middleware)
        await listener.process(b, middleware)
        sinon.assert.calledTwice(execute)
      })
      it('executes when forced, after prior listener fails', async () => {
        let processed = []
        const A = new BoolListener(true, () => processed.push('A'))
        const B = new BoolListener(false, () => processed.push('B'))
        const C = new BoolListener(true, () => processed.push('C'), { force: true })
        await A.process(b, middleware)
        await B.process(b, middleware)
        await C.process(b, middleware)
        expect(processed).to.eql(['A', 'C'])
      })
      it('executes bit if ID used as callback', async () => {
        const callback = sinon.spy()
        const mockBitId = bot.setupBit({ id: 'listen-test', callback: callback })
        const bitListener = new MockListener('listen-test')
        await bitListener.process(b)
        sinon.assert.calledOnce(callback)
      })
      it('gives message in state to middleware pieces', async () => {
        await listener.process(b, middleware)
        sinon.assert.calledWith(piece, sinon.match(b))
      })
      it('calls done with match status if given', async () => {
        const done = sinon.spy()
        await listener.process(b, middleware, done)
        sinon.assert.calledWith(done, true)
      })
      it('calls done even when unmatched', async () => {
        const done = sinon.spy()
        const badB = new bot.State({ message: new bot.TextMessage(mockUser, 'no match') })
        await listener.process(badB, middleware, done)
        sinon.assert.calledWith(done, false)
      })
      it('if done returns promise, process waits for resolution', async () => {
        let done: number
        await listener.process(b, middleware, () => {
          done = Date.now()
          return delay(20)
        })
        expect(Date.now()).to.be.gte(done)
      })
      it('if middleware rejected, done is called with false', () => {
        const badMiddleware = new bot.Middleware('fail')
        badMiddleware.register(() => {
          throw new Error('(╯°□°）╯︵ ┻━┻')
        })
        return listener.process(b, badMiddleware, (result) => {
          expect(result).to.equal(false)
        })
      })
      it('state is changed by reference', async () => {
        await listener.process(b, middleware)
        expect(b.matched).to.equal(true)
      })
      it('consecutive listeners share state changes', async () => {
        listener.force = true
        middleware.register((b) => {
          b.modified = (!b.modified) ? 1 : b.modified + 1
        })
        await listener.process(b, middleware)
        await listener.process(b, middleware)
        expect(b.modified).to.equal(2)
      })
      it('state collects matching listeners and match results', async () => {
        const b = new bot.State({ message: new bot.TextMessage(mockUser, 'foo') })
        const listeners = [
          new bot.CustomListener(() => 1, (b) => {
            expect(b.match).to.equal(1)
          }, { id: 'A', force: true }),
          new bot.CustomListener(() => 2, (b) => {
            expect(b.match).to.equal(2)
          }, { id: 'B', force: true }),
          new bot.CustomListener(() => 3, (b) => {
            expect(b.match).to.equal(3)
          }, { id: 'C', force: true })
        ]
        for (let listener of listeners) await listener.process(b)
        expect(b.match).to.equal(3)
        expect(b.matched).to.equal(true)
      })
    })
  })
  describe('TextListener', () => {
    it('.process adds matcher result to state', () => {
      const fooListener = new bot.TextListener(/foo/, (state) => {
        expect(state.match).to.eql('foo'.match(/foo/))
      })
      return fooListener.process(new bot.State({
        message: new bot.TextMessage(mockUser, 'foo')
      }))
    })
  })
  describe('CustomListener', () => {
    it('.process runs custom matcher', async () => {
      const fooMatcher = sinon.spy((message) => {
        return /foo/.test(message.toString())
      })
      const fooListener = new bot.CustomListener(fooMatcher, () => null)
      await fooListener.process(new bot.State({
        message: new bot.TextMessage(mockUser, 'foo')
      }))
      sinon.assert.calledOnce(fooMatcher)
    })
    it('.process resolves state with async matcher result', async () => {
      const asyncMatcher = async (message) => {
        await delay(20)
        return 'delayed'
      }
      const asyncListener = new bot.CustomListener(asyncMatcher, () => null)
      const result = await asyncListener.process(new bot.State({
        message: new bot.TextMessage(mockUser, '')
      }))
      expect(result.match).to.equal('delayed')
    })
  })
  describe('NaturalLanguageListener', () => {
    it('.process returns state with truthy match for matching results', async () => {
      const nluListener = new bot.NaturalLanguageListener({
        intent: { id: 'foo' }
      }, (state) => {
        expect(state.match).to.eql({
          intent: [{ id: 'foo', name: 'Test Foo' }]
        })
      })
      const message = new bot.TextMessage(mockUser, 'foo')
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluListener.process(new bot.State({ message }))
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.process returns state with falsy match if below score threshold', async () => {
      const nluListener = new bot.NaturalLanguageListener({
        intent: { id: 'foo', score: .8 }
      }, () => null)
      const message = new bot.TextMessage(mockUser, 'foo')
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', score: .7 })
      const b = await nluListener.process(new bot.State({ message }))
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('NaturalLanguageDirectListener', () => {
    it('.process returns true for matches with bot prefix', async () => {
      const nluListener = new bot.NaturalLanguageListenerDirect({
        intent: { id: 'foo' }
      }, () => null)
      const message = new bot.TextMessage(mockUser, `${bot.name} foo`)
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluListener.process(new bot.State({ message }))
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.process returns false for message without bot prefixed', async () => {
      const nluListener = new bot.NaturalLanguageListenerDirect({
        intent: { id: 'foo' }
      }, () => null)
      const message = new bot.TextMessage(mockUser, `foo`)
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluListener.process(new bot.State({ message }))
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('.listenText', () => {
    it('adds text listener to collection, returning ID', () => {
      const id = bot.listenText(/test/, () => null)
      expect(bot.globalListeners.listen[id]).to.be.instanceof(bot.TextListener)
    })
  })
  describe('.listenDirect', () => {
    it('adds text listener to collection, returning ID', () => {
      const id = bot.listenDirect(/test/, () => null)
      expect(bot.globalListeners.listen[id]).to.be.instanceof(bot.TextListener)
    })
  })
  describe('.listenCustom', () => {
    const id = bot.listenCustom(() => null, () => null)
    expect(bot.globalListeners.listen[id]).to.be.instanceof(bot.CustomListener)
  })
  describe('.understand', () => {
    it('adds NLU listener to NLU collection, returning ID', () => {
      const id = bot.understandText({ intent: { id: 'test' } }, () => null)
      expect(bot.globalListeners.understand[id]).to.be.instanceof(bot.NaturalLanguageListener)
    })
  })
  describe('.understandDirect', () => {
    it('adds NLU direct listener to NLU collection, returning ID', () => {
      const id = bot.understandDirect({ intent: { id: 'test' } }, () => null)
      expect(bot.globalListeners.understand[id]).to.be.instanceof(bot.NaturalLanguageListenerDirect)
    })
  })
  describe('.understandCustom', () => {
    it('adds custom listener to NLU collection, returning ID', () => {
      const id = bot.understandCustom(() => null, () => null)
      expect(bot.globalListeners.understand[id]).to.be.instanceof(bot.CustomListener)
    })
  })
  describe('.directPattern', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = bot.directPattern(/test/)
      expect(direct.toString()).to.include(bot.name).and.include('test')
    })
    it('matches when bot name is prefixed', async () => {
      const direct = bot.directPattern(/test/)
      expect(direct.test(`${bot.name} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed', async () => {
      const direct = bot.directPattern(/test/)
      expect(direct.test(`${bot.alias} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed with @ symbol', async () => {
      const direct = bot.directPattern(/test/)
      expect(direct.test(`@${bot.name} test`)).to.equal(true)
    })
    it('does not match on name unless otherwise matched', async () => {
      const direct = bot.directPattern(/test/)
      expect(direct.test(`${bot.name}`)).to.equal(false)
    })
    it('does not match unless bot name is prefixed', async () => {
      const direct = bot.directPattern(/test/)
      expect(direct.test(`test`)).to.equal(false)
    })
  })
  describe('.listenEnter', () => {
    it('.process calls callback on enter messages', async () => {
      const callback = sinon.spy()
      const message = new bot.EnterMessage(mockUser)
      const id = bot.listenEnter(callback)
      await bot.globalListeners.listen[id].process(new bot.State({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenLeave', () => {
    it('.process calls callback on leave messages', async () => {
      const callback = sinon.spy()
      const message = new bot.LeaveMessage(mockUser)
      const id = bot.listenLeave(callback)
      await bot.globalListeners.listen[id].process(new bot.State({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenTopic', () => {
    it('.process calls callback on topic messages', async () => {
      const callback = sinon.spy()
      const message = new bot.TopicMessage(mockUser)
      const id = bot.listenTopic(callback)
      await bot.globalListeners.listen[id].process(new bot.State({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenCatchAll', () => {
    it('.process calls callback on catchAll messages', async () => {
      const callback = sinon.spy()
      const message = new bot.CatchAllMessage(new bot.TextMessage(mockUser, ''))
      const id = bot.listenCatchAll(callback)
      await bot.globalListeners.act[id].process(new bot.State({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.unloadListeners', () => {
    it('clears all listeners from collection', () => {
      bot.listenCatchAll(() => null)
      bot.listenText(/.*/, () => null)
      bot.understandText({}, () => null)
      bot.understandCustom(() => null, () => null)
      bot.unloadListeners()
      expect(bot.globalListeners.listen).to.eql({})
      expect(bot.globalListeners.understand).to.eql({})
    })
  })
})
