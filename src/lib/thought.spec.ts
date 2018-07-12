import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

let message: bot.TextMessage
let mockAdapter: bot.MessageAdapter
class MockMessenger extends bot.MessageAdapter {
  name = 'mock-messenger'
  async dispatch () { return }
  async start () { return }
  async shutdown () { return }
}
class MockLanguage extends bot.LanguageAdapter {
  name = 'mock-language'
  async process (message: bot.TextMessage) {
    return {
      intent: [{ id: 'test', score: 1 }],
      entities: [{ id: 'testing' }],
      language: [{ id: 'en' }]
    }
  }
  async start () { return }
  async shutdown () { return }
}
class MockStorage extends bot.StorageAdapter {
  name = 'mock-storage'
  async start () { return }
  async shutdown () { return }
  async saveMemory () { return }
  async loadMemory () { return }
  async keep () { return }
  async find () { return }
  async findOne () { return }
  async lose () { return }
}

describe('thought', () => {
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
    mockAdapter = sinon.createStubInstance(MockMessenger)
    bot.adapters.message = mockAdapter
  })
  describe('Thought', () => {
    it('with listeners, processes listeners', async () => {
      const listeners = new bot.Listeners()
      let listens = []
      listeners.custom(() => true, () => listens.push('A'), { force: true })
      listeners.custom(() => true, () => listens.push('B'), { force: true })
      const thought = new bot.Thought(listeners)
      await thought.hear(message)
      expect(listens).to.eql(['A', 'B'])
    })
    it('with listeners, ignores global listeners', async () => {
      const listeners = new bot.Listeners()
      let listens = []
      bot.listenCustom(() => true, () => listens.push('A'), { force: true })
      listeners.custom(() => true, () => listens.push('B'), { force: true })
      listeners.custom(() => true, () => listens.push('C'), { force: true })
      const thought = new bot.Thought(listeners)
      await thought.hear(message)
      expect(listens).to.eql(['B', 'C'])
    })
    it('without listeners, uses global listeners', async () => {
      const listeners = new bot.Listeners()
      let listens = []
      bot.listenCustom(() => true, () => listens.push('A'), { force: true })
      listeners.custom(() => true, () => listens.push('B'), { force: true })
      listeners.custom(() => true, () => listens.push('C'), { force: true })
      const thought = new bot.Thought()
      await thought.hear(message)
      expect(listens).to.eql(['A'])
    })
  })
  describe('.thoughts', () => {
    describe('.hear', () => {
      it('resolves with a state instance', async () => {
        const b = await bot.thoughts.hear(message)
        expect(b).to.be.instanceof(bot.B)
      })
      it('executes hear middleware', async () => {
        const b = await bot.thoughts.hear(message)
        expect(b).to.have.property('hearTest', true)
      })
      it('proceeds to .listen when middleware passes', async () => {
        const onListen = sinon.spy()
        bot.events.on('listen', onListen)
        await bot.thoughts.hear(message)
        sinon.assert.calledOnce(onListen) // called once because listener matched
      })
      it('does not proceed to .listen if middleware interrupted', async () => {
        bot.listenCustom(() => true, () => null)
        bot.middlewares.hear.register((b, next, done) => done())
        const onListen = sinon.spy()
        bot.events.on('listen', onListen)
        await bot.thoughts.hear(message)
        sinon.assert.notCalled(onListen)
      })
      it('adds timestamp to state', async () => {
        const now = Date.now()
        const b = await bot.thoughts.hear(message)
        expect(b.heard).to.be.gte(now)
      })
    })
    describe('.listen', () => {
      it('resolves with a state instance', async () => {
        const b = await bot.thoughts.hear(message)
        expect(b).to.be.instanceof(bot.B)
      })
      it('state inherits changes from .hear middleware', async () => {
        const onListen = sinon.spy()
        bot.events.on('listen', onListen)
        await bot.thoughts.hear(message)
        expect(onListen.args[0][0]).to.have.property('hearTest', true)
      })
      it('calls process on each listener', async () => {
        bot.listenCustom(() => true, () => null, { id: 'listen-test-1' })
        bot.listenCustom(() => true, () => null, { id: 'listen-test-2' })
        const listener1 = sinon.spy(bot.globalListeners.listen['listen-test-1'], 'process')
        const listener2 = sinon.spy(bot.globalListeners.listen['listen-test-2'], 'process')
        await bot.thoughts.listen(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(listener1)
        sinon.assert.calledOnce(listener2)
      })
      it('executes listen middleware if listeners match', async () => {
        bot.listenCustom(() => true, () => null)
        const b = new bot.B({ message })
        await bot.thoughts.listen(b, () => Promise.resolve())
        expect(b).to.have.property('listenTest', true)
      })
      it('does not execute middleware without listener match', async () => {
        bot.listenCustom(() => false, () => null)
        const b = new bot.B({ message })
        await bot.thoughts.listen(b, () => Promise.resolve())
        expect(b).to.not.have.property('listenTest')
      })
      it('does not execute middleware without listeners', async () => {
        const b = new bot.B({ message })
        await bot.thoughts.listen(b, () => Promise.resolve())
        expect(b).to.not.have.property('listenTest')
      })
      it('continues to .understand if unmatched', async () => {
        const onUnderstand = sinon.spy()
        bot.listenCustom(() => false, () => null, { id: 'listen-test' })
        bot.events.on('understand', onUnderstand)
        await bot.thoughts.listen(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(onUnderstand)
      })
      it('stops processing if state finished', async () => {
        bot.listenCustom(() => true, () => null, { id: 'listen-test-1' })
        bot.listenCustom(() => true, () => null, { id: 'listen-test-2' })
        const listener1 = sinon.spy(bot.globalListeners.listen['listen-test-1'], 'process')
        const listener2 = sinon.spy(bot.globalListeners.listen['listen-test-2'], 'process')
        bot.listenMiddleware((b, next, done) => {
          b.finish()
          next(done)
        })
        await bot.thoughts.listen(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(listener1)
        sinon.assert.notCalled(listener2)
      })
      it('does not continue to .understand if matched', async () => {
        const onUnderstand = sinon.spy()
        bot.listenCustom(() => true, () => null)
        bot.events.once('understand', onUnderstand)
        await bot.thoughts.listen(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.notCalled(onUnderstand)
      })
      it('adds timestamp to state', async () => {
        bot.listenCustom(() => true, () => null)
        const now = Date.now()
        const b = new bot.B({ message })
        await bot.thoughts.listen(b, () => Promise.resolve())
        expect(b.listened).to.be.gte(now)
      })
    })
    describe('.understand', () => {
      beforeEach(() => bot.adapters.language = new MockLanguage(bot))
      afterEach(() => delete bot.adapters.language)
      it('state inherits changes from .listen middleware', async () => {
        bot.listenCustom(() => true, () => null)
        const onListen = sinon.spy()
        bot.events.once('listen', onListen)
        await bot.thoughts.listen(new bot.B({ message }), () => Promise.resolve())
        expect(onListen.args[0][0]).to.have.property('listenTest', true)
      })
      it('calls process on each NLU listener', async () => {
        bot.understandCustom(() => true, () => null, { id: 'nlu-test-1' })
        bot.understandCustom(() => true, () => null, { id: 'nlu-test-2' })
        const nlu1 = sinon.spy(bot.globalListeners.understand['nlu-test-1'], 'process')
        const nlu2 = sinon.spy(bot.globalListeners.understand['nlu-test-2'], 'process')
        await bot.thoughts.understand(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(nlu1)
        sinon.assert.calledOnce(nlu2)
      })
      it('NLU listeners receive message with NLU from adapter', async () => {
        bot.adapters.language.process = async () => {
          return { intent: new bot.NaturalLanguageResult().add({ id: 'test' }) }
        }
        bot.understandCustom((message: bot.TextMessage) => {
          expect(message.nlu.results.intent).to.eql([{ id: 'test' }])
        }, () => null)
        return bot.thoughts.understand(new bot.B({ message }), () => Promise.resolve())
      })
      it('executes understand middleware if listeners match', async () => {
        bot.understandCustom(() => true, () => null)
        const b = new bot.B({ message })
        await bot.thoughts.understand(b, () => Promise.resolve())
        expect(b).to.have.property('understandTest', true)
      })
      it('does not execute middleware without listener match', async () => {
        bot.understandCustom(() => false, () => null)
        const b = new bot.B({ message })
        await bot.thoughts.understand(b, () => Promise.resolve())
        expect(b).to.not.have.property('understandTest')
      })
      it('does not execute middleware without listeners', async () => {
        const b = new bot.B({ message })
        await bot.thoughts.understand(b, () => Promise.resolve())
        expect(b).to.not.have.property('understandTest')
      })
      it('continues to .act if unmatched', async () => {
        const onAct = sinon.spy()
        bot.events.on('act', onAct)
        bot.understandCustom(() => false, () => null, { id: 'nlu-test' })
        await bot.thoughts.understand(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(onAct)
      })
      it('stops processing if state finished', async () => {
        bot.understandCustom(() => true, () => null, { id: 'nlu-test-1' })
        bot.understandCustom(() => true, () => null, { id: 'nlu-test-2' })
        const nlu1 = sinon.spy(bot.globalListeners.understand['nlu-test-1'], 'process')
        const nlu2 = sinon.spy(bot.globalListeners.understand['nlu-test-2'], 'process')
        bot.understandMiddleware((b, next, done) => {
          b.finish()
          next()
        })
        await bot.thoughts.understand(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(nlu1)
        sinon.assert.notCalled(nlu2)
      })
      it('does not continue to .act if matched', async () => {
        const onAct = sinon.spy()
        bot.understandCustom(() => true, () => null)
        bot.events.once('act', onAct)
        await bot.thoughts.understand(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.notCalled(onAct)
      })
      it('adds timestamp to state', async () => {
        bot.understandCustom(() => true, () => null)
        const now = Date.now()
        const b = new bot.B({ message })
        await bot.thoughts.understand(b, () => Promise.resolve())
        expect(b.understood).to.be.gte(now)
      })
    })
    describe('.act', () => {
      it('listeners receive catch-all wrapped message', async () => {
        const callback = sinon.spy()
        bot.listenCatchAll(callback)
        await bot.thoughts.act(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(callback)
        expect(callback.args[0][0].message).to.be.instanceof(bot.CatchAllMessage)
        expect(callback.args[0][0].message.message).to.eql(message)
      })
      it('calls process on each catch listener', async () => {
        bot.listenCatchAll(() => null, { id: 'catch-test-1' })
        bot.listenCatchAll(() => null, { id: 'catch-test-2' })
        const catch1 = sinon.spy(bot.globalListeners.act['catch-test-1'], 'process')
        const catch2 = sinon.spy(bot.globalListeners.act['catch-test-2'], 'process')
        await bot.thoughts.act(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(catch1)
        sinon.assert.calledOnce(catch2)
      })
      it('executes act middleware with catch-all listeners', async () => {
        bot.listenCatchAll(() => null)
        const b = new bot.B({ message })
        await bot.thoughts.act(b, () => Promise.resolve())
        expect(b).to.have.property('actTest', true)
      })
      it('does not execute middleware without catch-all listeners', async () => {
        const b = new bot.B({ message })
        await bot.thoughts.act(b, () => Promise.resolve())
        expect(b).to.not.have.property('actTest')
      })
      it('stops processing if state finished', async () => {
        bot.listenCatchAll(() => null, { id: 'catch-test-1' })
        bot.listenCatchAll(() => null, { id: 'catch-test-2' })
        const catch1 = sinon.spy(bot.globalListeners.act['catch-test-1'], 'process')
        const catch2 = sinon.spy(bot.globalListeners.act['catch-test-2'], 'process')
        bot.actMiddleware((b, next, done) => {
          b.finish()
          next()
        })
        await bot.thoughts.act(new bot.B({ message }), () => Promise.resolve())
        sinon.assert.calledOnce(catch1)
        sinon.assert.notCalled(catch2)
      })
      it('adds timestamp to state', async () => {
        bot.listenCatchAll(() => null)
        const now = Date.now()
        const b = new bot.B({ message })
        await bot.thoughts.act(b, () => Promise.resolve())
        expect(b.acted).to.be.gte(now)
      })
    })
    describe('.respond', () => {
      it('throws if state does not contain an response envelope', () => {
        const b = new bot.B({ message })
        bot.thoughts.respond(b, () => Promise.resolve())
          .then(() => expect(true).to.equal(false))
          .catch((e) => expect(e).to.be.an('Error'))
      })
      it('enters respond process, executing middleware', async () => {
        const b = new bot.B({ message })
        b.respondEnvelope()
        await bot.thoughts.respond(b, () => Promise.resolve())
        expect(b).to.have.property('respondTest', true)
      })
      it('calls dispatch on message adapter with envelope', async () => {
        const b = new bot.B({ message })
        b.respondEnvelope()
        await bot.thoughts.respond(b)
        sinon.assert.calledWithExactly((mockAdapter.dispatch as sinon.SinonStub), b.envelope)
      })
      it('receives state when invoked by state respond', async () => {
        const b = new bot.B({ message })
        const onRespond = sinon.spy()
        bot.events.once('respond', onRespond)
        await b.respond()
        sinon.assert.calledWithExactly(onRespond, b)
      })
      it('adds timestamp to state', async () => {
        const now = Date.now()
        const b = new bot.B({ message })
        b.respondEnvelope()
        await bot.thoughts.respond(b, () => Promise.resolve())
        expect(b.responded).to.be.gte(now)
      })
    })
    describe('.remember', () => {
      before(() => sinon.stub(bot, 'keep'))
      beforeEach(() => {
        bot.adapters.message = new MockMessenger(bot)
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
      it('adapter keep receives state after process', async () => {
        const b = new bot.B({ message })
        await bot.thoughts.remember(b)
        sinon.assert.calledWithExactly((bot.keep as sinon.SinonStub), 'states', b)
      })
      it('adds timestamp to state', async () => {
        const now = Date.now()
        const b = new bot.B({ message })
        await bot.thoughts.remember(b)
        expect(b.remembered).to.be.gte(now)
      })
      it('remembers incoming without matching listeners', async () => {
        const now = Date.now()
        const b = await bot.receive(message)
        expect(b.remembered).to.be.gte(now)
      })
    })
  })
  describe('.receive', () => {
    it('remembers state if hear middleware passed', async () => {
      const onRemember = sinon.spy()
      bot.events.on('remember', onRemember)
      const b = await bot.receive(message)
      sinon.assert.calledWithExactly(onRemember, b)
    })
    it('does not remember if middleware interrupts', async () => {
      bot.hearMiddleware((b, next, done) => done())
      const onRemember = sinon.spy()
      bot.events.on('remember', onRemember)
      const b = await bot.receive(message)
      sinon.assert.notCalled(onRemember)
    })
    it('state has timestamps from all actioned processes', async () => {
      bot.listenCustom(() => true, (b) => b.respond('ping'))
      const now = Date.now()
      const b = await bot.receive(message)
      expect(b.heard, 'heard gte now').to.be.gte(now)
      expect(b.listened, 'listened gte heard').to.be.gte(b.heard)
      expect(b.responded, 'responded gte listened').to.be.gte(b.listened)
      expect(b.remembered, 'remembered gte responded').to.be.gte(b.responded)
    })
  })
  describe('.dispatch', () => {
    it('remembers state if hear middleware passed', async () => {
      const onRemember = sinon.spy()
      bot.events.once('remember', onRemember)
      const envelope = new bot.Envelope({ user: new bot.User() }).write('hello')
      const b = await bot.dispatch(envelope)
      sinon.assert.calledWithExactly(onRemember, b)
    })
    it('does not remember if middleware interrupts', async () => {
      bot.respondMiddleware((b, next, done) => done())
      const onRemember = sinon.spy()
      bot.events.once('remember', onRemember)
      const envelope = new bot.Envelope({ user: new bot.User() }).write('hello')
      const b = await bot.dispatch(envelope)
      sinon.assert.notCalled(onRemember)
    })
  })
})
