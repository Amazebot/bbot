import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'
import * as thought from './thought-process'

let message: bot.TextMessage
let mockAdapter: bot.Adapter
const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

describe('thought-process', () => {
  before(() => {
    message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
  })
  beforeEach(async () => {
    // Start with fresh middleware to track state changes in each stage
    await bot.load()
    bot.hearMiddleware((b, next, done) => b.hearTest = true)
    bot.listenMiddleware((b, next, done) => b.listenTest = true)
    bot.understandMiddleware((b, next, done) => b.understandTest = true)
    bot.respondMiddleware((b, next, done) => b.respondTest = true)
    bot.rememberMiddleware((b, next, done) => b.rememberTest = true)
  })
  describe('.hear', () => {
    it('enters hear process, executing middleware', async () => {
      const callback = sinon.spy()
      bot.load()
      bot.hearMiddleware((b, next, done) => {
        callback()
        done()
      })
      await thought.hear(new bot.TextMessage(new bot.User(), 'test'))
      sinon.assert.calledOnce(callback)
    })
    it('calls callback before resolving', async () => {
      const callback = sinon.spy()
      await thought.hear(message, callback)
      sinon.assert.calledOnce(callback)
    })
    it('proceeds to .listen when middleware passes', async () => {
      bot.listenCustom(() => true, () => null, { id: 'hear-test' })
      const onListen = sinon.spy()
      bot.events.on('listen', () => onListen())
      await thought.hear(message)
      sinon.assert.calledOnce(onListen) // called once because listener matched
    })
    it('does not proceed to .listen if middleware interrupted', async () => {
      bot.listenCustom(() => true, () => null, { id: 'hear-test' })
      bot.middlewares.hear.register((b, next, done) => done())
      const onListen = sinon.spy()
      bot.events.on('listen', () => onListen())
      await thought.hear(message)
      sinon.assert.notCalled(onListen)
    })
    it('resolves after async middleware', async () => {
      bot.hearMiddleware((b, next, done) => {
        return delay(50).then(() => {
          b.delayed = true
          next()
        })
      })
      const b = await thought.hear(message)
      expect(b.delayed).to.equal(true)
    })
  })
  describe('.listen', () => {
    it('state inherits changes from .hear middleware', async () => {
      const onListen = sinon.spy()
      bot.events.on('listen', onListen)
      await thought.hear(message)
      expect(onListen.args[0][0]).to.have.property('hearTest', true)
    })
    it('calls process on each listener', async () => {
      bot.listenCustom(() => true, () => null, { id: 'listen-test-1' })
      bot.listenCustom(() => true, () => null, { id: 'listen-test-2' })
      const listener1 = sinon.spy(bot.listeners['listen-test-1'], 'process')
      const listener2 = sinon.spy(bot.listeners['listen-test-2'], 'process')
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(listener1)
      sinon.assert.calledOnce(listener2)
    })
    it('continues to .understand if unmatched', async () => {
      const onUnderstand = sinon.spy()
      bot.listenCustom(() => false, () => null, { id: 'listen-test' })
      bot.events.on('understand', onUnderstand)
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(onUnderstand)
    })
    it('stops processing if state finished', async () => {
      bot.listenText(/.*/, () => null, { id: 'listen-test-1' })
      bot.listenText(/.*/, () => null, { id: 'listen-test-2' })
      const listener1 = sinon.spy(bot.listeners['listen-test-1'], 'process')
      const listener2 = sinon.spy(bot.listeners['listen-test-2'], 'process')
      bot.listenMiddleware((b, next, done) => {
        b.finish()
        next()
      })
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(listener1)
      sinon.assert.notCalled(listener2)
    })
    it('does not continue to .understand if matched', async () => {
      const onUnderstand = sinon.spy()
      bot.listenText(/.*/, () => null, { id: 'listen-test-2' })
      bot.events.on('understand', onUnderstand)
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.notCalled(onUnderstand)
    })
    it('does not continue to .understand if catch-all', async () => {
      const onUnderstand = sinon.spy()
      const b = new bot.B({ message: new bot.CatchAllMessage(message) })
      bot.events.on('understand', onUnderstand)
      await thought.listen(b, () => Promise.resolve())
      sinon.assert.notCalled(onUnderstand)
    })
    it('resolves after async middleware', () => {
      const b = new bot.B({ message: new bot.CatchAllMessage(message) })
      bot.listenMiddleware((b, next, done) => {
        return delay(50).then(() => {
          b.delayed = true
          next()
        })
      })
      return thought.listen(b, async () => {
        expect(b.delayed).to.equal(true)
      })
    })
  })
  describe('.understand', () => {
    it('state inherits changes from .hear middleware', async () => {
      const onUnderstand = sinon.spy()
      bot.events.once('understand', onUnderstand)
      await thought.hear(message)
      expect(onUnderstand.args[0][0]).to.have.property('hearTest', true)
    })
    it('calls process on each NLU listener', async () => {
      bot.understandCustom(() => true, () => null, { id: 'nlu-test-1' })
      bot.understandCustom(() => true, () => null, { id: 'nlu-test-2' })
      const nlu1 = sinon.spy(bot.nluListeners['nlu-test-1'], 'process')
      const nlu2 = sinon.spy(bot.nluListeners['nlu-test-2'], 'process')
      await thought.understand(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(nlu1)
      sinon.assert.calledOnce(nlu2)
    })
    it('continues to .act if unmatched', async () => {
      const onAct = sinon.spy()
      bot.events.on('act', onAct)
      bot.understandCustom(() => false, () => null, { id: 'nlu-test' })
      await thought.understand(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(onAct)
    })
    it('stops processing if state finished', async () => {
      bot.understandCustom(() => true, () => null, { id: 'nlu-test-1' })
      bot.understandCustom(() => true, () => null, { id: 'nlu-test-2' })
      const nlu1 = sinon.spy(bot.nluListeners['nlu-test-1'], 'process')
      const nlu2 = sinon.spy(bot.nluListeners['nlu-test-2'], 'process')
      bot.understandMiddleware((b, next, done) => {
        b.finish()
        next()
      })
      await thought.understand(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(nlu1)
      sinon.assert.notCalled(nlu2)
    })
    it('does not continue to .act if matched', async () => {
      const onAct = sinon.spy()
      bot.understandCustom(() => true, () => null, { id: 'nlu-test' })
      bot.events.once('act', onAct)
      await thought.understand(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.notCalled(onAct)
    })
    it('resolves after async middleware', () => {
      const b = new bot.B({ message: new bot.CatchAllMessage(message) })
      bot.understandMiddleware((b, next, done) => {
        return delay(50).then(() => {
          b.delayed = true
          next()
        })
      })
      return thought.understand(b, async () => {
        expect(b.delayed).to.equal(true)
      })
    })
  })
  describe('.act', () => {
    it('state inherits changes from .hear middleware', async () => {
      const onAct = sinon.spy()
      bot.events.once('act', onAct)
      await thought.hear(message)
      expect(onAct.args[0][0]).to.have.property('hearTest', true)
    })
    it('calls .hear again with catch-all when nothing matches', async () => {
      const onHear = sinon.spy()
      bot.events.once('hear', onHear)
      const final = await thought.hear(message)
      sinon.assert.calledTwice(onHear)
      expect(onHear.args[0][0]).to.be.instanceof(bot.TextMessage)
      expect(onHear.args[1][0]).to.be.instanceof(bot.CatchAllMessage)
    })
    it('listeners receive catch-all after .act', async () => {
      const callback = sinon.spy()
      bot.listenCatchAll(callback)
      await thought.act(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(callback)
      expect(callback.args[0][0].message).to.be.instanceof(bot.CatchAllMessage)
    })
  })
  describe('.respond', () => {
    beforeEach(() => {
      class MockMessenger extends bot.MessageAdapter { name = 'mock-adapter' }
      mockAdapter = new MockMessenger(bot)
      mockAdapter.test = sinon.spy()
      mockAdapter.send = () => null
      bot.adapters.message = mockAdapter
    })
    after(() => {
      delete bot.adapters.message
    })
    it('calls method on message adapter with envelope', async () => {
      const message = new bot.TextMessage(new bot.User(), 'testing')
      const b = new bot.B({ message, method: 'test' })
      await thought.respond(b)
      sinon.assert.calledWithExactly(mockAdapter.test, b.envelope)
    })
    it('receives state when invoked by state respond', async () => {
      const message = new bot.TextMessage(new bot.User(), 'testing')
      const b = new bot.B({ message, method: 'test' })
      const onRespond = sinon.spy()
      bot.events.once('respond', onRespond)
      await b.respond('test')
      sinon.assert.calledWithExactly(onRespond, b)
    })
    it('resolves after async middleware', () => {
      const b = new bot.B({ message: new bot.CatchAllMessage(message) })
      bot.respondMiddleware((b, next, done) => {
        return delay(50).then(() => {
          b.delayed = true
          next()
        })
      })
      return thought.respond(b, async () => {
        expect(b.delayed).to.equal(true)
      })
    })
  })
  describe('.remember', () => {
    beforeEach(() => {
      class MockStorage extends bot.StorageAdapter { name = 'mock-storage' }
      class MockMessenger extends bot.MessageAdapter { name = 'mock-messenger' }
      const mockMessenger = new MockMessenger(bot)
      mockAdapter = new MockStorage(bot)
      mockMessenger.send = () => Promise.resolve()
      mockAdapter.keep = sinon.spy()
      bot.adapters.storage = mockAdapter
      bot.adapters.message = mockMessenger
    })
    after(() => {
      delete bot.adapters.storage
      delete bot.adapters.message
    })
    it('receives state at end of thought process', async () => {
      const onRemember = sinon.spy()
      bot.events.once('remember', onRemember)
      const b = await thought.hear(message)
      sinon.assert.calledWithExactly(onRemember, b)
    })
    it('adapter keep receives state after process', async () => {
      const b = new bot.B({ message: new bot.CatchAllMessage(message) })
      await thought.remember(b)
      sinon.assert.calledWithExactly(mockAdapter.keep, 'states', b)
    })
    it('state has timestamps from all actioned processes', async () => {
      bot.listenText(/.*/, async (b) => {
        await b.write('responding').respond()
      }, { id: 'listen-remember-test' })
      const message = new bot.TextMessage(new bot.User(), 'testing')
      const onRespond = sinon.spy()
      const b = await bot.hear(message)
      console.log(b.heard)
      console.log(b.listened)
      console.log(b.responded)
      console.log(b.remembered)
      console.log('finished', Date.now())
    })
  })
})
