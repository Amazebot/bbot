import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import {
  User,
  TextMessage,
  Middleware,
  setupBit,
  name,
  alias,
  EnterMessage,
  LeaveMessage,
  TopicMessage,
  CatchAllMessage
} from '..'
import * as listen from './listen'

// setup spies and mock listener class that matches on 'test'
const mockUser = new User('TEST_ID', { name: 'testy' })

// message matching listener that looks for 'test'
const mockMessage = new TextMessage(mockUser, 'test')
class MockListener extends listen.Listener {
  async matcher (message) { return /test/.test(message.text) }
}

// spy on listener and middleware methods
const callback = sinon.spy()
const mockListener = new MockListener(callback)
const matcher = sinon.spy(mockListener, 'matcher')
const mockMiddleware = new Middleware('mock')
const mockPiece = sinon.spy()
const execute = sinon.spy(mockMiddleware, 'execute')
mockMiddleware.register(mockPiece)

const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

describe('listen', () => {
  describe('Listener', () => {
    afterEach(() => {
      matcher.resetHistory()
      callback.resetHistory()
      mockPiece.resetHistory()
      execute.resetHistory()
    })
    it('accepts and stores callback function', () => {
      expect(mockListener.callback).to.eql(callback)
    })
    it('accepts bit ID to create callback', () => {
      const bitListener = new MockListener('BIT_ID')
      expect(mockListener.callback).to.be.a('function')
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
      it('calls matcher with message', () => {
        mockListener.process(mockMessage)
        sinon.assert.calledWith(matcher, mockMessage)
      })
      it('executes middleware if given', async () => {
        await mockListener.process(mockMessage, mockMiddleware)
        sinon.assert.calledOnce(execute)
      })
      it('executes bit if ID used as callback', async () => {
        const callback = sinon.spy()
        const mockBitId = setupBit({ id: 'listen-test', callback: callback })
        const bitListener = new MockListener('listen-test')
        await bitListener.process(mockMessage)
        sinon.assert.calledOnce(callback)
      })
      it('gives message in state to middleware pieces', async () => {
        await mockListener.process(mockMessage, mockMiddleware)
        sinon.assert.calledWith(mockPiece, sinon.match({ message: mockMessage }))
      })
      it('calls callback with match if given', async () => {
        const callback = sinon.spy()
        await mockListener.process(mockMessage, mockMiddleware, callback)
        sinon.assert.calledWith(callback, true)
      })
      it('calls callback even when unmatched', async () => {
        const callback = sinon.spy()
        const wrongMessage = new TextMessage(mockUser, 'no match')
        await mockListener.process(wrongMessage, mockMiddleware, callback)
        sinon.assert.calledWith(callback, false)
      })
    })
  })
  describe('TextListener', () => {
    it('.process adds matcher result to state', () => {
      const fooListener = new listen.TextListener(/foo/, (state) => {
        expect(state.match).to.eql('foo'.match(/foo/))
      })
      return fooListener.process(new TextMessage(mockUser, 'foo'))
    })
  })
  describe('CustomListener', () => {
    it('.process runs custom matcher', async () => {
      const fooMatcher = sinon.spy((message) => {
        return /foo/.test(message.toString())
      })
      const fooListener = new listen.CustomListener(fooMatcher, () => null)
      await fooListener.process(new TextMessage(mockUser, 'foo'))
      sinon.assert.calledOnce(fooMatcher)
    })
    it('.process resolves state with async matcher result', async () => {
      const asyncMatcher = async (message) => {
        await delay(20)
        return 'delayed'
      }
      const asyncListener = new listen.CustomListener(asyncMatcher, () => null)
      const result = await asyncListener.process(new TextMessage(mockUser, ''))
      expect(result.match).to.equal('delayed')
    })
  })
  describe('NaturalLanguageListener', () => {
    it('.process adds matcher result to state', () => {
      const nluListener = new listen.NaturalLanguageListener({
        intent: 'foo'
      }, (state) => {
        expect(state.match).to.eql({
          intent: 'foo',
          entities: {},
          confidence: 20
        })
      })
      const message = new TextMessage(mockUser, 'foo')
      message.nlu = { intent: 'foo', entities: {}, confidence: 100 }
      return nluListener.process(message)
    })
    it('.process fails match below confidence threshold', async () => {
      const nluListener = new listen.NaturalLanguageListener({
        intent: 'foo'
      }, () => null)
      const message = new TextMessage(mockUser, 'foo')
      message.nlu = { intent: 'foo', entities: {}, confidence: 79 }
      const state = await nluListener.process(message)
      expect(state.matched).to.equal(false)
    })
  })
  describe('.listenText', () => {
    it('adds text listener to collection, returning ID', () => {
      const id = listen.listenText(/test/, () => null)
      expect(listen.listeners[id]).to.be.instanceof(listen.TextListener)
    })
  })
  describe('.listenDirect', () => {
    it('adds text listener to collection, returning ID', () => {
      const id = listen.listenDirect(/test/, () => null)
      expect(listen.listeners[id]).to.be.instanceof(listen.TextListener)
    })
  })
  describe('.listenCustom', () => {
    const id = listen.listenCustom(() => null, () => null)
    expect(listen.listeners[id]).to.be.instanceof(listen.CustomListener)
  })
  describe('.understand', () => {
    it('adds NLU listener to NLU collection, returning ID', () => {
      const id = listen.understand({ intent: 'test' }, () => null)
      expect(listen.nluListeners[id]).to.be.instanceof(listen.NaturalLanguageListener)
    })
  })
  describe('.understandCustom', () => {
    it('adds custom listener to NLU collection, returning ID', () => {
      const id = listen.understandCustom(() => null, () => null)
      expect(listen.nluListeners[id]).to.be.instanceof(listen.CustomListener)
    })
  })
  describe('.directPattern', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = listen.directPattern(/test/)
      expect(direct.toString()).to.include(name).and.include('test')
    })
    it('matches when bot name is prefixed', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`${name} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`${alias} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed with @ symbol', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`@${name} test`)).to.equal(true)
    })
    it('does not match on name unless otherwise matched', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`${name}`)).to.equal(false)
    })
    it('does not match unless bot name is prefixed', async () => {
      const direct = listen.directPattern(/test/)
      expect(direct.test(`test`)).to.equal(false)
    })
  })
  describe('.listenEnter', () => {
    it('.process calls callback on enter messages', async () => {
      const callback = sinon.spy()
      const message = new EnterMessage(mockUser)
      const id = listen.listenEnter(callback)
      await listen.listeners[id].process(message)
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenLeave', () => {
    it('.process calls callback on enter messages', async () => {
      const callback = sinon.spy()
      const message = new LeaveMessage(mockUser)
      const id = listen.listenLeave(callback)
      await listen.listeners[id].process(message)
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenTopic', () => {
    it('.process calls callback on enter messages', async () => {
      const callback = sinon.spy()
      const message = new TopicMessage(mockUser)
      const id = listen.listenTopic(callback)
      await listen.listeners[id].process(message)
      sinon.assert.calledOnce(callback)
    })
  })
  describe('.listenCatchAll', () => {
    it('.process calls callback on enter messages', async () => {
      const callback = sinon.spy()
      const message = new CatchAllMessage(new TextMessage(mockUser, ''))
      const id = listen.listenCatchAll(callback)
      await listen.listeners[id].process(message)
      sinon.assert.calledOnce(callback)
    })
  })
})
