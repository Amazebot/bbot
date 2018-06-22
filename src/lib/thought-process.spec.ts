import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'
import * as thought from './thought-process'

let message: bot.TextMessage
let mockAdapter: bot.Adapter

describe('thought-process', () => {
  before(() => {
    message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
  })
  beforeEach(async () => {
    // Start with fresh middleware to track state changes in each stage
    await bot.reset()
    await bot.load()
    bot.hearMiddleware((b, next, done) => b.hearTest = true)
    bot.listenMiddleware((b, next, done) => b.listenTest = true)
    bot.understandMiddleware((b, next, done) => b.understandTest = true)
    bot.actMiddleware((b, next, done) => b.actTest = true)
    bot.respondMiddleware((b, next, done) => b.respondTest = true)
    bot.rememberMiddleware((b, next, done) => b.rememberTest = true)
  })
  describe('.hear', () => {
    it('executes hear middleware', async () => {
      const b = await thought.hear(message, () => Promise.resolve())
      expect(b).to.have.property('hearTest', true)
    })
    it('calls callback before resolving', async () => {
      const callback = sinon.spy()
      await thought.hear(message, callback)
      sinon.assert.calledOnce(callback)
    })
    it('proceeds to .listen when middleware passes', async () => {
      const onListen = sinon.spy()
      bot.events.on('listen', () => onListen())
      await thought.hear(message)
      sinon.assert.calledOnce(onListen) // called once because listener matched
    })
    it('does not proceed to .listen if middleware interrupted', async () => {
      bot.listenCustom(() => true, () => null)
      bot.middlewares.hear.register((b, next, done) => done())
      const onListen = sinon.spy()
      bot.events.on('listen', () => onListen())
      await thought.hear(message)
      sinon.assert.notCalled(onListen)
    })
    it('adds timestamp to state', async () => {
      const now = Date.now()
      const b = await thought.hear(message)
      expect(b.heard).to.be.gte(now)
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
    it('executes listen middleware if listeners match', async () => {
      bot.listenCustom(() => true, () => null)
      const b = new bot.B({ message })
      await thought.listen(b, () => Promise.resolve())
      expect(b).to.have.property('listenTest', true)
    })
    it('does not execute middleware without listener match', async () => {
      bot.listenCustom(() => false, () => null)
      const b = new bot.B({ message })
      await thought.listen(b, () => Promise.resolve())
      expect(b).to.not.have.property('listenTest')
    })
    it('does not execute middleware without listeners', async () => {
      const b = new bot.B({ message })
      await thought.listen(b, () => Promise.resolve())
      expect(b).to.not.have.property('listenTest')
    })
    it('continues to .understand if unmatched', async () => {
      const onUnderstand = sinon.spy()
      bot.listenCustom(() => false, () => null, { id: 'listen-test' })
      bot.events.on('understand', onUnderstand)
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(onUnderstand)
    })
    it('stops processing if state finished', async () => {
      bot.listenCustom(() => true, () => null, { id: 'listen-test-1' })
      bot.listenCustom(() => true, () => null, { id: 'listen-test-2' })
      const listener1 = sinon.spy(bot.listeners['listen-test-1'], 'process')
      const listener2 = sinon.spy(bot.listeners['listen-test-2'], 'process')
      bot.listenMiddleware((b, next, done) => {
        b.finish()
        next(done)
      })
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(listener1)
      sinon.assert.notCalled(listener2)
    })
    it('does not continue to .understand if matched', async () => {
      const onUnderstand = sinon.spy()
      bot.listenCustom(() => true, () => null)
      bot.events.once('understand', onUnderstand)
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.notCalled(onUnderstand)
    })
    it('adds timestamp to state', async () => {
      bot.listenCustom(() => true, () => null)
      const now = Date.now()
      const b = new bot.B({ message })
      await thought.listen(b, () => Promise.resolve())
      expect(b.listened).to.be.gte(now)
    })
  })
  describe('.understand', () => {
    it('state inherits changes from .listen middleware', async () => {
      bot.listenCustom(() => true, () => null)
      const onListen = sinon.spy()
      bot.events.once('listen', onListen)
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      expect(onListen.args[0][0]).to.have.property('listenTest', true)
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
    it('executes understand middleware if listeners match', async () => {
      bot.understandCustom(() => true, () => null)
      const b = new bot.B({ message })
      await thought.understand(b, () => Promise.resolve())
      expect(b).to.have.property('understandTest', true)
    })
    it('does not execute middleware without listener match', async () => {
      bot.understandCustom(() => false, () => null)
      const b = new bot.B({ message })
      await thought.understand(b, () => Promise.resolve())
      expect(b).to.not.have.property('understandTest')
    })
    it('does not execute middleware without listeners', async () => {
      const b = new bot.B({ message })
      await thought.understand(b, () => Promise.resolve())
      expect(b).to.not.have.property('understandTest')
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
      bot.understandCustom(() => true, () => null)
      bot.events.once('act', onAct)
      await thought.understand(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.notCalled(onAct)
    })
    it('adds timestamp to state', async () => {
      bot.understandCustom(() => true, () => null)
      const now = Date.now()
      const b = new bot.B({ message })
      await thought.understand(b, () => Promise.resolve())
      expect(b.understood).to.be.gte(now)
    })
  })
  describe('.act', () => {
    it('listeners receive catch-all wrapped message', async () => {
      const callback = sinon.spy()
      bot.listenCatchAll(callback)
      await thought.act(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(callback)
      expect(callback.args[0][0].message).to.be.instanceof(bot.CatchAllMessage)
      expect(callback.args[0][0].message.message).to.eql(message)
    })
    it('calls process on each catch listener', async () => {
      bot.listenCatchAll(() => null, { id: 'catch-test-1' })
      bot.listenCatchAll(() => null, { id: 'catch-test-2' })
      const catch1 = sinon.spy(bot.catchAllListeners['catch-test-1'], 'process')
      const catch2 = sinon.spy(bot.catchAllListeners['catch-test-2'], 'process')
      await thought.act(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(catch1)
      sinon.assert.calledOnce(catch2)
    })
    it('executes act middleware with catch-all listeners', async () => {
      bot.listenCatchAll(() => null)
      const b = new bot.B({ message })
      await thought.act(b, () => Promise.resolve())
      expect(b).to.have.property('actTest', true)
    })
    it('does not execute middleware without catch-all listeners', async () => {
      const b = new bot.B({ message })
      await thought.act(b, () => Promise.resolve())
      expect(b).to.not.have.property('actTest')
    })
    it('stops processing if state finished', async () => {
      bot.listenCatchAll(() => null, { id: 'catch-test-1' })
      bot.listenCatchAll(() => null, { id: 'catch-test-2' })
      const catch1 = sinon.spy(bot.catchAllListeners['catch-test-1'], 'process')
      const catch2 = sinon.spy(bot.catchAllListeners['catch-test-2'], 'process')
      bot.actMiddleware((b, next, done) => {
        b.finish()
        next()
      })
      await thought.act(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(catch1)
      sinon.assert.notCalled(catch2)
    })
    it('adds timestamp to state', async () => {
      bot.listenCatchAll(() => null)
      const now = Date.now()
      const b = new bot.B({ message })
      await thought.act(b, () => Promise.resolve())
      expect(b.acted).to.be.gte(now)
    })
  })
  describe('.respond', () => {
    beforeEach(() => {
      class MockMessenger extends bot.MessageAdapter { name = 'mock-adapter' }
      mockAdapter = new MockMessenger(bot)
      mockAdapter.respond = sinon.spy()
      bot.adapters.message = mockAdapter
    })
    after(() => {
      delete bot.adapters.message
    })
    it('enters respond process, executing middleware', async () => {
      const b = new bot.B({ message })
      await thought.respond(b, () => Promise.resolve())
      expect(b).to.have.property('respondTest', true)
    })
    it('calls callback after resolving', async () => {
      const b = new bot.B({ message })
      const callback = sinon.spy()
      await thought.respond(b, callback)
      sinon.assert.calledOnce(callback)
    })
    it('proceeds to remember when middleware passing', async () => {
      const onRemember = sinon.spy()
      bot.events.on('remember', () => onRemember())
      await thought.respond(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(onRemember)
    })
    it('does not remember if middleware interrupts', async () => {
      bot.respondMiddleware((b, next, done) => done())
      const onRemember = sinon.spy()
      bot.events.on('remember', () => onRemember())
      await thought.respond(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.notCalled(onRemember)
    })
    it('does not remember twice when responding from listener', async () => {
      const onRemember = sinon.spy()
      bot.events.on('remember', () => onRemember())
      bot.listenCustom(() => true, (b) => b.respond())
      await thought.listen(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.calledOnce(onRemember)
    })
    it('calls respond on message adapter with envelope', async () => {
      const b = new bot.B({ message, method: 'test' })
      await thought.respond(b)
      sinon.assert.calledWithExactly(mockAdapter.respond, b.envelope, 'test')
    })
    it('respond on message adapter uses send as default method', async () => {
      const b = new bot.B({ message })
      await thought.respond(b)
      sinon.assert.calledWithExactly(mockAdapter.respond, b.envelope, 'send')
    })
    it('receives state when invoked by state respond', async () => {
      const b = new bot.B({ message, method: 'test' })
      const onRespond = sinon.spy()
      bot.events.once('respond', onRespond)
      await b.respond('test')
      sinon.assert.calledWithExactly(onRespond, b)
    })
    it('adds timestamp to state', async () => {
      const now = Date.now()
      const b = new bot.B({ message })
      await thought.respond(b, () => Promise.resolve())
      expect(b.responded).to.be.gte(now)
    })
    /** @todo executes middleware, adds default envelope, adds responded ts, calls callback */
    // use .hear as example for above
    // check message adapter tests updated for .respond to have
    // check that listen and understand go to remember with or without respond
    // remember should record matched and unmatched, for statistics
  })
  describe('.remember', () => {
    before(() => sinon.stub(bot, 'keep'))
    beforeEach(() => {
      class MockMessenger extends bot.MessageAdapter { name = 'mock-messenger' }
      bot.adapters.message = new MockMessenger(bot)
      class MockStorage extends bot.StorageAdapter { name = 'mock-storage' }
      bot.adapters.storage = new MockStorage(bot)
    })
    afterEach(() => {
      (bot.keep as sinon.SinonStub).resetHistory()
    })
    after(() => {
      (bot.keep as sinon.SinonStub).restore()
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
      const b = new bot.B({ message })
      await thought.remember(b)
      sinon.assert.calledWithExactly((bot.keep as sinon.SinonStub), 'states', b)
    })
    it('adds timestamp to state', async () => {
      const now = Date.now()
      const b = new bot.B({ message })
      await thought.remember(b, () => Promise.resolve())
      expect(b.remembered).to.be.gte(now)
    })
    it('state has timestamps from all actioned processes', async () => {
      bot.listenCustom(() => true, (b) => b.respond())
      const now = Date.now()
      const b = await bot.hear(message)
      expect(b.heard).to.be.gte(now)
      expect(b.listened).to.be.gte(b.heard)
      expect(b.responded).to.be.gte(b.listened)
      expect(b.remembered).to.be.gte(b.responded)
    })
  })
})
