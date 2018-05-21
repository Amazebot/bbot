import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'
import * as thought from './thought-process'

// Mock for initial state object
const message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')

describe('thought-process', () => {
  beforeEach(async () => {
    // Start with fresh middleware to track state changes in each stage
    await bot.load()
    bot.hearMiddleware((b, next, done) => b.heard = true)
    bot.listenMiddleware((b, next, done) => b.listened = true)
    bot.understandMiddleware((b, next, done) => b.understood = true)
    bot.respondMiddleware((b, next, done) => b.responded = true)
    bot.rememberMiddleware((b, next, done) => b.remembered = true)
  })
  describe('.hear', () => {
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
  })
  describe('.listen', () => {
    it('state inherits changes from .hear middleware', async () => {
      const onListen = sinon.spy()
      bot.events.on('listen', onListen)
      await thought.hear(message)
      expect(onListen.args[0][0]).to.have.property('heard', true)
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
  })
  describe('.understand', () => {
    it('state inherits changes from .hear middleware', async () => {
      const onUnderstand = sinon.spy()
      bot.events.on('understand', onUnderstand)
      await thought.hear(message)
      expect(onUnderstand.args[0][0]).to.have.property('heard', true)
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
      bot.events.on('act', onAct)
      await thought.understand(new bot.B({ message }), () => Promise.resolve())
      sinon.assert.notCalled(onAct)
    })
  })
  describe('.act', () => {
    it('state inherits changes from .hear middleware', async () => {
      const onAct = sinon.spy()
      bot.events.on('act', onAct)
      await thought.hear(message)
      expect(onAct.args[0][0]).to.have.property('heard', true)
    })
    it('calls .hear again with catch-all when nothing matches', async () => {
      const onHear = sinon.spy()
      bot.events.on('hear', onHear)
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
})
