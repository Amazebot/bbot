import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '.'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
class MockMessenger extends bot.adapter.Message {
  name = 'mock-messenger'
  async dispatch () { return }
  async start () { return }
  async shutdown () { return }
}
class MockNLU extends bot.adapter.NLU {
  name = 'mock-nlu'
  async process () {
    return {
      intent: [{ id: 'test', score: 1 }],
      entities: [{ id: 'testing' }],
      language: [{ id: 'en' }]
    }
  }
  async start () { return }
  async shutdown () { return }
}
class MockStorage extends bot.adapter.Storage {
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
const message = bot.message.text(
  bot.user.create({ id: 'test-user' }),
  `Where there a foo, there's a bar. And with you, there's always a bar.`
)
describe('[thought]', () => {
  beforeEach(async () => {
    await bot.load()
    bot.adapter.adapters.message = sinon.createStubInstance(MockMessenger)
  })
  afterEach(() => bot.reset())
  describe('Thought', () => {
    describe('constructor', () => {
      it('constructor fails without corresponding middleware', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        expect(() => new bot.thought.Thought({ name, b }).process()).to.throw()
      })
    })
    describe('.process', () => {
      it('runs provided middleware', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const middleware = new bot.middleware.Middleware('test')
        const middlewarePiece = sinon.spy()
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, middleware }).process()
        sinon.assert.calledOnce(middlewarePiece)
      })
      it('calls validate, then middleware, then action', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const validate = sinon.stub().returns(true)
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const middleware = new bot.middleware.Middleware('test')
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, validate, middleware, action }).process()
        sinon.assert.callOrder(validate, middlewarePiece, action)
      })
      it('false from validate gives false to action', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const validate = async () => false
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const middleware = new bot.middleware.Middleware('test')
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, validate, middleware, action }).process()
        sinon.assert.notCalled(middlewarePiece)
        sinon.assert.calledWithExactly(action, false)
      })
      it('adds timestamp if middleware complete', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const middlewarePiece = (_: any, next: any) => next()
        const middleware = new bot.middleware.Middleware('test')
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, middleware }).process()
        expect(b.processed).to.include.keys('test')
      })
      it('action called only once with interrupted middleware', async () => {
        const action = sinon.spy()
        const b = bot.state.create({ message })
        const name = 'test'
        const middlewarePiece = (_: any, next: any) => next()
        const middleware = new bot.middleware.Middleware('test')
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, middleware, action }).process()
        sinon.assert.calledOnce(action)
      })
      it('no timestamp if middleware incomplete', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const middlewarePiece = (_: any, __: any, done: any) => done()
        const middleware = new bot.middleware.Middleware('test')
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, middleware }).process()
        expect(b.processed).to.not.include.keys('test')
      })
      it('with branches, calls validate, then middleware, then branch callback, then action', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const validate = sinon.stub().returns(true)
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const branchCallback = sinon.spy()
        const branches = {
          test: new bot.branch.Custom(() => true, () => branchCallback())
        }
        const middleware = new bot.middleware.Middleware('test')
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, validate, middleware, branches, action }).process()
        sinon.assert.callOrder(validate, middlewarePiece, branchCallback, action)
      })
      it('with branches, exits if empty branch collection', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const middleware = new bot.middleware.Middleware('test')
        const branches = {}
        middleware.register(middlewarePiece)
        await new bot.thought.Thought({ name, b, middleware, branches, action }).process()
        sinon.assert.notCalled(middlewarePiece)
        sinon.assert.calledWithExactly(action, false)
      })
      it('with branches, no timestamp if state already done', async () => {
        const b = bot.state.create({ message, done: true })
        const name = 'test'
        const middleware = new bot.middleware.Middleware('test')
        const branches = {
          test: new bot.branch.Custom(() => true, () => null)
        }
        await new bot.thought.Thought({ name, b, middleware, branches }).process()
        expect(typeof b.processed.test).to.equal('undefined')
      })
      it('with branches, calls consecutive branches if forced', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const middleware = new bot.middleware.Middleware('test')
        const callback = sinon.spy()
        const branches = {
          'A': new bot.branch.Custom(() => true, callback),
          'B': new bot.branch.Custom(() => true, callback, { force: true })
        }
        await new bot.thought.Thought({ name, b, middleware, branches }).process()
        sinon.assert.calledTwice(callback)
      })
      it('with branches, stops processing when state done', async () => {
        const b = bot.state.create({ message })
        const name = 'test'
        const middleware = new bot.middleware.Middleware('test')
        const callback = sinon.spy()
        const branches = {
          'A': new bot.branch.Custom(() => true, (b) => b.finish()),
          'B': new bot.branch.Custom(() => true, callback, { force: true })
        }
        await new bot.thought.Thought({ name, b, middleware, branches }).process()
        sinon.assert.notCalled(callback)
      })
      it('named hear, processes hear middleware', async () => {
        bot.middleware.register('hear', (b, _, __) => b.hearTest = true)
        const b = bot.state.create({ message })
        await new bot.thought.Thought({ name: 'hear', b }).process()
        expect(b.hearTest).to.equal(true)
      })
      it('named listen, processes listen middleware', async () => {
        bot.middleware.register('listen', (b, _, __) => b.listenTest = true)
        const b = bot.state.create({ message })
        await new bot.thought.Thought({ name: 'listen', b }).process()
        expect(b.listenTest).to.equal(true)
      })
      it('named understand, processes understand middleware', async () => {
        bot.middleware.register('understand', (b, _, __) => b.understandTest = true)
        const b = bot.state.create({ message })
        await new bot.thought.Thought({ name: 'understand', b }).process()
        expect(b.understandTest).to.equal(true)
      })
      it('named act, processes act middleware', async () => {
        bot.middleware.register('act', (b, _, __) => b.actTest = true)
        const b = bot.state.create({ message })
        await new bot.thought.Thought({ name: 'act', b }).process()
        expect(b.actTest).to.equal(true)
      })
      it('named respond, processes respond middleware', async () => {
        bot.middleware.register('respond', (b, _, __) => b.respondTest = true)
        const b = bot.state.create({ message })
        await new bot.thought.Thought({ name: 'respond', b }).process()
        expect(b.respondTest).to.equal(true)
      })
      it('named remember, processes remember middleware', async () => {
        bot.middleware.register('remember', (b, _, __) => b.rememberTest = true)
        const b = bot.state.create({ message })
        await new bot.thought.Thought({ name: 'remember', b }).process()
        expect(b.rememberTest).to.equal(true)
      })
    })
  })
  describe('Thoughts', () => {
    beforeEach(() => {
      bot.adapter.adapters.nlu = new MockNLU(bot)
      bot.adapter.adapters.storage = sinon.createStubInstance(MockStorage)
    })
    afterEach(() => {
      delete bot.adapter.adapters.nlu
      delete bot.adapter.adapters.storage
    })
    describe('.start', () => {
      it('receive records initiating sequence', async () => {
        const b = await new bot.thought.Thoughts(bot.state.create({ message }))
        .start('receive')
        expect(b.sequence).to.equal('receive')
      })
      it('with path, processes branches', async () => {
        const path = bot.path.create()
        let listens: string[] = []
        path.custom(() => true, () => listens.push('A'), { force: true })
        path.custom(() => true, () => listens.push('B'), { force: true })
        await new bot.thought.Thoughts(bot.state.create({ message }), path)
          .start('receive')
        expect(listens).to.eql(['A', 'B'])
      })
      it('receive records initiating sequence', async () => {
        const b = await new bot.thought.Thoughts(bot.state.create({ message }))
          .start('respond')
        expect(b.sequence).to.equal('respond')
      })
      it('with path, respond keeps initial sequence', async () => {
        const path = bot.path.create()
        path.custom(() => true, (b) => b.respond('test'))
        const b = await new bot.thought.Thoughts(bot.state.create({ message }), path)
          .start('receive')
        expect(b.sequence).to.equal('receive')
        expect(b.processed).to.include.keys('respond')
      })
      it('with path, ignores global path', async () => {
        const path = bot.path.create()
        let listens: string[] = []
        bot.global.custom(() => true, () => listens.push('A'), { force: true })
        path.custom(() => true, () => listens.push('B'), { force: true })
        path.custom(() => true, () => listens.push('C'), { force: true })
        await new bot.thought.Thoughts(bot.state.create({ message }), path)
          .start('receive')
        expect(listens).to.eql(['B', 'C'])
      })
      it('continues to following branches after branch responds', async () => {
        const path = bot.path.create()
        let processed = false
        path.custom(() => true, (b) => b.respond('foo'))
        path.custom(() => true, () => (processed = true), { force: true })
        await new bot.thought.Thoughts(bot.state.create({ message }), path)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('continues to following branches after async callback', async () => {
        const path = bot.path.create()
        let processed = false
        path.custom(() => true, () => delay(50))
        path.custom(() => true, () => (processed = true), { force: true })
        await new bot.thought.Thoughts(bot.state.create({ message }), path)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('continues to following branches after async matcher', async () => {
        const path = bot.path.create()
        let processed = false
        path.custom(() => delay(50).then(() => true), () => null)
        path.custom(() => true, () => (processed = true), { force: true })
        await new bot.thought.Thoughts(bot.state.create({ message }), path)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('without path, uses global path', async () => {
        const path = bot.path.create()
        let listens: string[] = []
        bot.global.custom(() => true, () => listens.push('A'), { force: true })
        path.custom(() => true, () => listens.push('B'), { force: true })
        path.custom(() => true, () => listens.push('C'), { force: true })
        await new bot.thought.Thoughts(bot.state.create({ message })).start('receive')
        expect(listens).to.eql(['A'])
      })
      it('does hear', async () => {
        bot.middleware.register('hear', (b, _, __) => b.hearTest = true)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b).to.have.property('hearTest', true)
      })
      it('does listen when hear uninterrupted', async () => {
        bot.global.custom(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('listen')
      })
      it('does not listen when hear interrupted', async () => {
        bot.global.custom(() => true, () => null)
        bot.middleware.register('hear', (_, __, done) => done())
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('listen')
      })
      it('calls post-process action if interrupted, not ignored', async () => {
        bot.middleware.register('hear', (_: any, __: any, done: any) => {
          done()
        })
        const b = bot.state.create({ message })
        const thoughts = new bot.thought.Thoughts(b)
        let listenActioned = false
        thoughts.processes.listen.action = async function () {
          listenActioned = true
        }
        await thoughts.start('receive')
        expect(listenActioned).to.equal(true)
      })
      it('exits before post-process action if ignored', async () => {
        bot.middleware.register('hear', (_: any, __: any, done: any) => {
          b.ignore()
          done()
        })
        const b = bot.state.create({ message })
        const thoughts = new bot.thought.Thoughts(b)
        let listenActioned = false
        thoughts.processes.listen.action = async function () {
          listenActioned = true
        }
        await thoughts.start('receive')
        expect(listenActioned).to.equal(false)
      })
      it('does understand when listen unmatched', async () => {
        bot.global.custom(() => false, () => null)
        bot.global.customNLU(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('understand')
      })
      it('understand passes message to NLU adapter', async () => {
        bot.adapter.adapters.nlu!.process = sinon.spy()
        bot.global.customNLU(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        sinon.assert.calledWithExactly((bot.adapter.adapters.nlu!.process as sinon.SinonSpy), message)
      })
      it('understand branches include NLU results from adapter', async () => {
        bot.adapter.adapters.nlu!.process = async () => {
          return { intent: bot.nlu.result().add({ id: 'test' }) }
        }
        bot.global.customNLU(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.message.nlu!.results.intent).to.eql([{ id: 'test' }])
      })
      it('does not understand without adapter', async () => {
        bot.global.custom(() => false, () => null)
        bot.global.customNLU(() => true, () => null)
        delete bot.adapter.adapters.nlu
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand when listen matched', async () => {
        bot.global.custom(() => true, () => null)
        bot.global.customNLU(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand when message text is empty', async () => {
        bot.adapter.adapters.nlu!.process = sinon.spy()
        bot.global.customNLU(() => true, () => null)
        const empty = bot.message.text(bot.user.create(), '                   ')
        const b = bot.state.create({ message: empty })
        await new bot.thought.Thoughts(b).start('receive')
        sinon.assert.notCalled((bot.adapter.adapters.nlu!.process as sinon.SinonSpy))
      })
      it('does not understand when message too short', async () => {
        bot.adapter.adapters.nlu!.process = sinon.spy()
        bot.settings.set('nlu-min-length', 99)
        bot.global.customNLU(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        bot.settings.unset('nlu-min-length')
        sinon.assert.notCalled((bot.adapter.adapters.nlu!.process as sinon.SinonSpy))
      })
      it('does not understand when hear interrupted', async () => {
        bot.global.customNLU(() => true, () => null)
        bot.middleware.register('hear', (_, __, done) => done())
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand non-text messages', async () => {
        bot.global.customNLU(() => true, () => null)
        const b = bot.state.create({ message: bot.message.enter(bot.user.create()) })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does act when listen unmatched', async () => {
        bot.global.custom(() => false, () => null)
        bot.global.customNLU(() => false, () => null)
        bot.global.catchAll(() => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('act')
      })
      it('act replaces message with catch all', async () => {
        bot.global.catchAll(() => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.message instanceof bot.message.CatchAll).to.equal(true)
      })
      it('does not act when text branch matched', async () => {
        bot.global.custom(() => true, () => null)
        bot.global.catchAll(() => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('act')
      })
      it('does not act when NLU branch matched', async () => {
        bot.global.customNLU(() => true, () => null)
        bot.global.catchAll(() => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('act')
      })
      it('does respond if branch responds', async () => {
        bot.global.custom(() => true, (b) => b.respond('test'))
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('respond')
      })
      it('does not respond without adapter', async () => {
        delete bot.adapter.adapters.message
        bot.global.custom(() => true, (b) => b.respond('test'))
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('respond')
      })
      it('respond updates envelope with matched branch ID', async () => {
        bot.global.custom(() => true, (b) => b.respond('test'), { id: 'test' })
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.envelopes![0].branchId).to.equal('test')
      })
      it('respond passes message to nlu adapter', async () => {
        bot.global.custom(() => true, (b) => b.respond('test'))
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        const envelope = b.envelopes![0]
        sinon.assert.calledWithExactly((bot.adapter.adapters.message!.dispatch as sinon.SinonStub), envelope)
      })
      it('remembers user when branch matched', async () => {
        bot.memory.users = {}
        bot.global.custom(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(bot.memory.users[b.message.user.id]).to.eql(message.user)
      })
      it('remembers user when branch matched', async () => {
        bot.memory.users = {}
        bot.global.custom(() => false, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(typeof bot.memory.users[b.message.user.id]).to.equal('undefined')
      })
      it('does remember when branch matched', async () => {
        bot.global.custom(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('remember')
      })
      it('does not remember without adapter', async () => {
        bot.global.custom(() => true, () => null)
        delete bot.adapter.adapters.storage
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember when branch unmatched', async () => {
        bot.global.custom(() => false, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does remember on dispatch, without branch', async () => {
        const b = bot.state.create({ message })
        b.respondEnvelope().write('ping')
        await new bot.thought.Thoughts(b).start('dispatch')
        expect(b.processed).to.include.keys('remember')
      })
      it('does not remember on respond', async () => {
        bot.global.custom(() => true, () => null)
        const b = bot.state.create({ message })
        b.respondEnvelope().write('ping')
        await new bot.thought.Thoughts(b).start('respond')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember dispatch without envelope', async () => {
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('dispatch')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember when hear interrupted', async () => {
        bot.middleware.register('hear', (_, __, done) => done())
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('remember passes state to storage adapter', async () => {
        bot.global.custom(() => true, () => null)
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        sinon.assert.calledWithExactly(
          (bot.adapter.adapters.storage!.keep as sinon.SinonStub),
          'states',
          sinon.match({ message })
        )
      })
      it('remember only once with multiple responses', async () => {
        bot.global.custom(() => true, (b) => b.respond('A'))
        bot.global.custom(() => true, (b) => b.respond('B'), { force: true })
        const b = bot.state.create({ message })
        await new bot.thought.Thoughts(b).start('receive')
        expect(b.envelopes!.map((envelope) => envelope.strings)).to.eql([
          ['A'], ['B']
        ])
        sinon.assert.calledOnce((bot.adapter.adapters.storage!.keep as sinon.SinonStub))
      })
      describe('.receive', () => {
        it('timestamps all actioned processes', async () => {
          bot.global.custom(() => true, (b) => b.respond('ping'))
          const b = await bot.thought.receive(message)
          expect(b.processed).to.have.all.keys('hear', 'listen', 'respond', 'remember')
        })
        it('records initiating sequence and path', async () => {
          const b = await bot.thought.receive(message)
          expect(b.sequence).to.equal('receive')
        })
        it('consecutive calls isolate thought and path', async () => {
          const listenCallback = sinon.spy()
          const understandCallback = sinon.spy()
          bot.global.text(/foo/i, listenCallback, {
            id: 'receive-text'
          })
          bot.global.customNLU(() => true, understandCallback, {
            id: 'receive-custom-nlu'
          })
          bot.settings.set('nlu-min-length', 2)
          const messageA = bot.message.text(bot.user.create(), 'foo')
          const messageB = bot.message.text(bot.user.create(), 'bar')
          await bot.thought.receive(messageA)
          await bot.thought.receive(messageB)
          sinon.assert.calledOnce(listenCallback)
          sinon.assert.calledOnce(understandCallback)
          bot.settings.unset('nlu-min-length')
        })
      })
      describe('.respond', () => {
        it('timestamps all actioned processes', async () => {
          const b = bot.state.create({ message })
          b.respondEnvelope().write('ping')
          await bot.thought.respond(b)
          expect(b.processed).to.have.all.keys('respond')
        })
        it('records initiating sequence and path', async () => {
          const b = bot.state.create({ message })
          await bot.thought.respond(b)
          expect(b.sequence).to.equal('respond')
        })
      })
      describe('.dispatch', () => {
        it('timestamps all actioned processes', async () => {
          const envelope = bot.envelope.create({ user: bot.user.create() }).write('hello')
          const b = await bot.thought.dispatch(envelope)
          expect(b.processed).to.have.all.keys('respond', 'remember')
        })
        it('records initiating sequence and path', async () => {
          const envelope = bot.envelope.create({ user: bot.user.create() }).write('hello')
          const b = await bot.thought.dispatch(envelope)
          expect(b.sequence).to.equal('dispatch')
        })
      })
      describe('.serve', () => {
        it('timestamps all actioned processes', async () => {
          const message = bot.message.server({ userId: '111', data: {} })
          bot.global.server({}, (b) => b.respond('ping'))
          const b = await bot.thought.serve(message, ({} as bot.server.IContext))
          expect(b.processed).to.have.all.keys('hear', 'serve', 'respond', 'remember')
        })
      })
    })
  })
})
