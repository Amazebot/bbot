import 'mocha'
import sinon from 'sinon'
import { expect, assert } from 'chai'
import * as listen from './listen'
import * as bot from '..'

let mockUser: bot.User
let b: bot.B
let middleware: bot.Middleware
let callback: sinon.SinonSpy
let matcher: sinon.SinonSpy
let piece: sinon.SinonSpy
let execute: sinon.SinonSpy
let listener: listen.Listener

const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))
class MockListener extends listen.Listener {
  async matcher (message) {
    return /test/.test(message.toString())
  }
}
class BoolListener extends listen.Listener {
  constructor (
    public result: boolean,
    callback: listen.IListenerCallback,
    meta?: listen.IListenerMeta
  ) {
    super(callback, meta)
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
      b = new bot.B({ message: new bot.TextMessage(mockUser, 'test') })
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
    it('accepts additional properties as meta', () => {
      const metaListener = new MockListener(() => null, { foo: 'bar' })
      expect(metaListener.meta.foo).to.equal('bar')
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
      it('calls callback with match if given', async () => {
        const callback = sinon.spy()
        await listener.process(b, middleware, callback)
        sinon.assert.calledWith(callback, true)
      })
      it('calls callback even when unmatched', async () => {
        const callback = sinon.spy()
        const badB = new bot.B({ message: new bot.TextMessage(mockUser, 'no match') })
        await listener.process(badB, middleware, callback)
        sinon.assert.calledWith(callback, false)
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
    })
  })
  describe('TextListener', () => {
    it('.process adds matcher result to state', () => {
      const fooListener = new listen.TextListener(/foo/, (state) => {
        expect(state.match).to.eql('foo'.match(/foo/))
      })
      return fooListener.process(new bot.B({
        message: new bot.TextMessage(mockUser, 'foo')
      }))
    })
  })
  describe('CustomListener', () => {
    it('.process runs custom matcher', async () => {
      const fooMatcher = sinon.spy((message) => {
        return /foo/.test(message.toString())
      })
      const fooListener = new listen.CustomListener(fooMatcher, () => null)
      await fooListener.process(new bot.B({
        message: new bot.TextMessage(mockUser, 'foo')
      }))
      sinon.assert.calledOnce(fooMatcher)
    })
    it('.process resolves state with async matcher result', async () => {
      const asyncMatcher = async (message) => {
        await delay(20)
        return 'delayed'
      }
      const asyncListener = new listen.CustomListener(asyncMatcher, () => null)
      const result = await asyncListener.process(new bot.B({
        message: new bot.TextMessage(mockUser, '')
      }))
      expect(result.match).to.equal('delayed')
    })
  })
  describe('NaturalLanguageListener', () => {
    it('.process returns state with truthy match for matching results', async () => {
      const nluListener = new listen.NaturalLanguageListener({
        intent: { id: 'foo' }
      }, (state) => {
        expect(state.match).to.eql({
          intent: [{ id: 'foo', name: 'Test Foo' }]
        })
      })
      const message = new bot.TextMessage(mockUser, 'foo')
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', name: 'Test Foo' })
      const b = await nluListener.process(new bot.B({ message }))
      assert.isOk(b.match)
      assert.isTrue(b.matched)
    })
    it('.process returns state with falsy match if below score threshold', async () => {
      const nluListener = new listen.NaturalLanguageListener({
        intent: { id: 'foo', score: .8 }
      }, () => null)
      const message = new bot.TextMessage(mockUser, 'foo')
      message.nlu = new bot.NLU().addResult('intent', { id: 'foo', score: .7 })
      const b = await nluListener.process(new bot.B({ message }))
      assert.notOk(b.match)
      assert.isFalse(b.matched)
    })
  })
  describe('.listenText', () => {
    it('adds text listener to collection, returning ID', () => {
      const id = listen.listenText(/test/, () => null)
      expect(listen.globalListeners.listen[id]).to.be.instanceof(listen.TextListener)
    })
  })
  describe('.listenDirect', () => {
    it('adds text listener to collection, returning ID', () => {
      const id = listen.listenDirect(/test/, () => null)
      expect(listen.globalListeners.listen[id]).to.be.instanceof(listen.TextListener)
    })
  })
  describe('.listenCustom', () => {
    const id = listen.listenCustom(() => null, () => null)
    expect(listen.globalListeners.listen[id]).to.be.instanceof(listen.CustomListener)
  })
  describe('.understand', () => {
    it('adds NLU listener to NLU collection, returning ID', () => {
      const id = listen.understandText({ intent: { id: 'test' } }, () => null)
      expect(listen.globalListeners.understand[id]).to.be.instanceof(listen.NaturalLanguageListener)
    })
  })
  describe('.understandCustom', () => {
    it('adds custom listener to NLU collection, returning ID', () => {
      const id = listen.understandCustom(() => null, () => null)
      expect(listen.globalListeners.understand[id]).to.be.instanceof(listen.CustomListener)
    })
  })
  describe('.directPattern', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = listen.directPattern(/test/)
      expect(direct.toString()).to.include(bot.name).and.include('test')
    })
    it('matches when bot name is prefixed', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`${bot.name} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`${bot.alias} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed with @ symbol', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`@${bot.name} test`)).to.equal(true)
    })
    it('does not match on name unless otherwise matched', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`${bot.name}`)).to.equal(false)
    })
    it('does not match unless bot name is prefixed', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`test`)).to.equal(false)
    })
  })
  describe('.listenEnter', () => {
    it('.process calls callback on enter messages', async () => {
      const callback = sinon.spy()
      const message = new bot.EnterMessage(mockUser)
      const id = listen.listenEnter(callback)
      await listen.globalListeners.listen[id].process(new bot.B({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenLeave', () => {
    it('.process calls callback on leave messages', async () => {
      const callback = sinon.spy()
      const message = new bot.LeaveMessage(mockUser)
      const id = listen.listenLeave(callback)
      await listen.globalListeners.listen[id].process(new bot.B({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenTopic', () => {
    it('.process calls callback on topic messages', async () => {
      const callback = sinon.spy()
      const message = new bot.TopicMessage(mockUser)
      const id = listen.listenTopic(callback)
      await listen.globalListeners.listen[id].process(new bot.B({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenCatchAll', () => {
    it('.process calls callback on catchAll messages', async () => {
      const callback = sinon.spy()
      const message = new bot.CatchAllMessage(new bot.TextMessage(mockUser, ''))
      const id = listen.listenCatchAll(callback)
      await listen.globalListeners.act[id].process(new bot.B({ message }))
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.unloadListeners', () => {
    it('clears all listeners from collection', () => {
      listen.listenCatchAll(() => null)
      listen.listenText(/.*/, () => null)
      listen.understandText({}, () => null)
      listen.understandCustom(() => null, () => null)
      listen.unloadListeners()
      expect(listen.globalListeners.listen).to.eql({})
      expect(listen.globalListeners.understand).to.eql({})
    })
  })
})
