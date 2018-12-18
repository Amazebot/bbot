import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import adapters from '../controllers/adapters'
import messages from '../controllers/messages'
import users from '../controllers/users'
import { BranchController } from '../controllers/branches'
import { IContext } from '../controllers/server'
import { State } from './state'
import { Middleware } from './middleware'
import { CustomBranch } from './branch'
import { CatchAllMessage } from './message'
import { NLUResult } from './nlu'
import { Thought, Thoughts } from './thought'
import bBot from '../bot'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
class MockMessenger extends adapters.abstract.Message {
  name = 'mock-messenger'
  async dispatch () { return }
  async start () { return }
  async shutdown () { return }
}
class MockNLU extends adapters.abstract.NLU {
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
class MockStorage extends adapters.abstract.Storage {
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
const message = messages.text(
  users.create({ id: 'test-user' }),
  `Where there a foo, there's a bar. And with you, there's always a bar.`
)

describe('[thought]', () => {
  beforeEach(async () => {
    await bBot.load()
    bBot.adapters.loaded.message = sinon.createStubInstance(MockMessenger)
  })
  afterEach(() => bBot.reset())
  describe('Thought', () => {
    describe('constructor', () => {
      it('constructor fails without corresponding middleware', async () => {
        const b = new State({ message })
        const name = 'test'
        expect(() => new Thought({ name, b }).process()).to.throw()
      })
    })
    describe('.process', () => {
      it('runs provided middleware', async () => {
        const b = new State({ message })
        const name = 'test'
        const middleware = new Middleware('test')
        const middlewarePiece = sinon.spy()
        middleware.register(middlewarePiece)
        await new Thought({ name, b, middleware }).process()
        sinon.assert.calledOnce(middlewarePiece)
      })
      it('calls validate, then middleware, then action', async () => {
        const b = new State({ message })
        const name = 'test'
        const validate = sinon.stub().returns(true)
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const middleware = new Middleware('test')
        middleware.register(middlewarePiece)
        await new Thought({ name, b, validate, middleware, action }).process()
        sinon.assert.callOrder(validate, middlewarePiece, action)
      })
      it('false from validate gives false to action', async () => {
        const b = new State({ message })
        const name = 'test'
        const validate = async () => false
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const middleware = new Middleware('test')
        middleware.register(middlewarePiece)
        await new Thought({ name, b, validate, middleware, action }).process()
        sinon.assert.notCalled(middlewarePiece)
        sinon.assert.calledWithExactly(action, false)
      })
      it('adds timestamp if middleware complete', async () => {
        const b = new State({ message })
        const name = 'test'
        const middlewarePiece = (_: any, next: any) => next()
        const middleware = new Middleware('test')
        middleware.register(middlewarePiece)
        await new Thought({ name, b, middleware }).process()
        expect(b.processed).to.include.keys('test')
      })
      it('action called only once with interrupted middleware', async () => {
        const action = sinon.spy()
        const b = new State({ message })
        const name = 'test'
        const middlewarePiece = (_: any, next: any) => next()
        const middleware = new Middleware('test')
        middleware.register(middlewarePiece)
        await new Thought({ name, b, middleware, action }).process()
        sinon.assert.calledOnce(action)
      })
      it('no timestamp if middleware incomplete', async () => {
        const b = new State({ message })
        const name = 'test'
        const middlewarePiece = (_: any, __: any, done: any) => done()
        const middleware = new Middleware('test')
        middleware.register(middlewarePiece)
        await new Thought({ name, b, middleware }).process()
        expect(b.processed).to.not.include.keys('test')
      })
      it('with branches, calls validate, then middleware, then branch callback, then action', async () => {
        const b = new State({ message })
        const name = 'test'
        const validate = sinon.stub().returns(true)
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const branchCallback = sinon.spy()
        const branches = {
          test: new CustomBranch(() => true, () => branchCallback())
        }
        const middleware = new Middleware('test')
        middleware.register(middlewarePiece)
        await new Thought({ name, b, validate, middleware, branches, action }).process()
        sinon.assert.callOrder(validate, middlewarePiece, branchCallback, action)
      })
      it('with branches, exits if empty branch collection', async () => {
        const b = new State({ message })
        const name = 'test'
        const action = sinon.spy()
        const middlewarePiece = sinon.spy()
        const middleware = new Middleware('test')
        const branches = {}
        middleware.register(middlewarePiece)
        await new Thought({ name, b, middleware, branches, action }).process()
        sinon.assert.notCalled(middlewarePiece)
        sinon.assert.calledWithExactly(action, false)
      })
      it('with branches, no timestamp if state already done', async () => {
        const b = new State({ message, done: true })
        const name = 'test'
        const middleware = new Middleware('test')
        const branches = {
          test: new CustomBranch(() => true, () => null)
        }
        await new Thought({ name, b, middleware, branches }).process()
        expect(typeof b.processed.test).to.equal('undefined')
      })
      it('with branches, calls consecutive branches if forced', async () => {
        const b = new State({ message })
        const name = 'test'
        const middleware = new Middleware('test')
        const callback = sinon.spy()
        const branches = {
          'A': new CustomBranch(() => true, callback),
          'B': new CustomBranch(() => true, callback, { force: true })
        }
        await new Thought({ name, b, middleware, branches }).process()
        sinon.assert.calledTwice(callback)
      })
      it('with branches, stops processing when state done', async () => {
        const b = new State({ message })
        const name = 'test'
        const middleware = new Middleware('test')
        const callback = sinon.spy()
        const branches = {
          'A': new CustomBranch(() => true, (b) => b.finish()),
          'B': new CustomBranch(() => true, callback, { force: true })
        }
        await new Thought({ name, b, middleware, branches }).process()
        sinon.assert.notCalled(callback)
      })
      it('named hear, processes hear middleware', async () => {
        bBot.middlewares.register('hear', (b, _, __) => b.hearTest = true)
        const b = new State({ message })
        await new Thought({ name: 'hear', b }).process()
        expect(b.hearTest).to.equal(true)
      })
      it('named listen, processes listen middleware', async () => {
        bBot.middlewares.register('listen', (b, _, __) => b.listenTest = true)
        const b = new State({ message })
        await new Thought({ name: 'listen', b }).process()
        expect(b.listenTest).to.equal(true)
      })
      it('named understand, processes understand middleware', async () => {
        bBot.middlewares.register('understand', (b, _, __) => b.understandTest = true)
        const b = new State({ message })
        await new Thought({ name: 'understand', b }).process()
        expect(b.understandTest).to.equal(true)
      })
      it('named act, processes act middleware', async () => {
        bBot.middlewares.register('act', (b, _, __) => b.actTest = true)
        const b = new State({ message })
        await new Thought({ name: 'act', b }).process()
        expect(b.actTest).to.equal(true)
      })
      it('named respond, processes respond middleware', async () => {
        bBot.middlewares.register('respond', (b, _, __) => b.respondTest = true)
        const b = new State({ message })
        await new Thought({ name: 'respond', b }).process()
        expect(b.respondTest).to.equal(true)
      })
      it('named remember, processes remember middleware', async () => {
        bBot.middlewares.register('remember', (b, _, __) => b.rememberTest = true)
        const b = new State({ message })
        await new Thought({ name: 'remember', b }).process()
        expect(b.rememberTest).to.equal(true)
      })
    })
  })
  describe('Thoughts', () => {
    beforeEach(() => {
      bBot.adapters.loaded.nlu = new MockNLU(bBot)
      bBot.adapters.loaded.storage = sinon.createStubInstance(MockStorage)
    })
    afterEach(() => {
      delete bBot.adapters.loaded.nlu
      delete bBot.adapters.loaded.storage
    })
    describe('.start', () => {
      it('receive records initiating sequence', async () => {
        const b = await new Thoughts(new State({ message }))
        .start('receive')
        expect(b.sequence).to.equal('receive')
      })
      it('with path, processes branches', async () => {
        const branches = new BranchController()
        let listens: string[] = []
        branches.custom(() => true, () => listens.push('A'), { force: true })
        branches.custom(() => true, () => listens.push('B'), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(listens).to.eql(['A', 'B'])
      })
      it('receive records initiating sequence', async () => {
        const b = await new Thoughts(new State({ message }))
          .start('respond')
        expect(b.sequence).to.equal('respond')
      })
      it('with path, respond keeps initial sequence', async () => {
        const branches = new BranchController()
        branches.custom(() => true, (b) => b.respond('test'))
        const b = await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(b.sequence).to.equal('receive')
        expect(b.processed).to.include.keys('respond')
      })
      it('with path, ignores global path', async () => {
        const branches = new BranchController()
        let listens: string[] = []
        bBot.branches.custom(() => true, () => listens.push('A'), { force: true })
        branches.custom(() => true, () => listens.push('B'), { force: true })
        branches.custom(() => true, () => listens.push('C'), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(listens).to.eql(['B', 'C'])
      })
      it('continues to following branches after branch responds', async () => {
        const branches = new BranchController()
        let processed = false
        branches.custom(() => true, (b) => b.respond('foo'))
        branches.custom(() => true, () => (processed = true), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('continues to following branches after async callback', async () => {
        const branches = new BranchController()
        let processed = false
        branches.custom(() => true, () => delay(50))
        branches.custom(() => true, () => (processed = true), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('continues to following branches after async matcher', async () => {
        const branches = new BranchController()
        let processed = false
        branches.custom(() => delay(50).then(() => true), () => null)
        branches.custom(() => true, () => (processed = true), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('without path, uses global path', async () => {
        const branches = new BranchController()
        let listens: string[] = []
        bBot.branches.custom(() => true, () => listens.push('A'), { force: true })
        branches.custom(() => true, () => listens.push('B'), { force: true })
        branches.custom(() => true, () => listens.push('C'), { force: true })
        await new Thoughts(new State({ message })).start('receive')
        expect(listens).to.eql(['A'])
      })
      it('does hear', async () => {
        bBot.middlewares.register('hear', (b, _, __) => b.hearTest = true)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b).to.have.property('hearTest', true)
      })
      it('does listen when hear uninterrupted', async () => {
        bBot.branches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('listen')
      })
      it('does not listen when hear interrupted', async () => {
        bBot.branches.custom(() => true, () => null)
        bBot.middlewares.register('hear', (_, __, done) => done())
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('listen')
      })
      it('calls post-process action if interrupted, not ignored', async () => {
        bBot.middlewares.register('hear', (_: any, __: any, done: any) => {
          done()
        })
        const b = new State({ message })
        const thoughts = new Thoughts(b)
        let listenActioned = false
        thoughts.processes.listen.action = async function () {
          listenActioned = true
        }
        await thoughts.start('receive')
        expect(listenActioned).to.equal(true)
      })
      it('exits before post-process action if ignored', async () => {
        bBot.middlewares.register('hear', (_: any, __: any, done: any) => {
          b.ignore()
          done()
        })
        const b = new State({ message })
        const thoughts = new Thoughts(b)
        let listenActioned = false
        thoughts.processes.listen.action = async function () {
          listenActioned = true
        }
        await thoughts.start('receive')
        expect(listenActioned).to.equal(false)
      })
      it('does understand when listen unmatched', async () => {
        bBot.branches.custom(() => false, () => null)
        bBot.branches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('understand')
      })
      it('understand passes message to NLU adapter', async () => {
        bBot.adapters.loaded.nlu!.process = sinon.spy()
        bBot.branches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        sinon.assert.calledWithExactly((bBot.adapters.loaded.nlu!.process as sinon.SinonSpy), message)
      })
      it('understand branches include NLU results from adapter', async () => {
        bBot.adapters.loaded.nlu!.process = async () => {
          return { intent: new NLUResult().add({ id: 'test' }) }
        }
        bBot.branches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.message.nlu!.results.intent).to.eql([{ id: 'test' }])
      })
      it('does not understand without adapter', async () => {
        bBot.branches.custom(() => false, () => null)
        bBot.branches.customNLU(() => true, () => null)
        delete bBot.adapters.loaded.nlu
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand when listen matched', async () => {
        bBot.branches.custom(() => true, () => null)
        bBot.branches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand when message text is empty', async () => {
        bBot.adapters.loaded.nlu!.process = sinon.spy()
        bBot.branches.customNLU(() => true, () => null)
        const empty = bBot.messages.text(bBot.users.create(), '                   ')
        const b = new State({ message: empty })
        await new Thoughts(b).start('receive')
        sinon.assert.notCalled((bBot.adapters.loaded.nlu!.process as sinon.SinonSpy))
      })
      it('does not understand when message too short', async () => {
        bBot.adapters.loaded.nlu!.process = sinon.spy()
        bBot.config.set('nlu-min-length', 99)
        bBot.branches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        bBot.config.unset('nlu-min-length')
        sinon.assert.notCalled((bBot.adapters.loaded.nlu!.process as sinon.SinonSpy))
      })
      it('does not understand when hear interrupted', async () => {
        bBot.branches.customNLU(() => true, () => null)
        bBot.middlewares.register('hear', (_, __, done) => done())
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand non-text messages', async () => {
        bBot.branches.customNLU(() => true, () => null)
        const b = new State({ message: bBot.messages.enter(bBot.users.create()) })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does act when listen unmatched', async () => {
        bBot.branches.custom(() => false, () => null)
        bBot.branches.customNLU(() => false, () => null)
        bBot.branches.catchAll(() => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('act')
      })
      it('act replaces message with catch all', async () => {
        bBot.branches.catchAll(() => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.message instanceof CatchAllMessage).to.equal(true)
      })
      it('does not act when text branch matched', async () => {
        bBot.branches.custom(() => true, () => null)
        bBot.branches.catchAll(() => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('act')
      })
      it('does not act when NLU branch matched', async () => {
        bBot.branches.customNLU(() => true, () => null)
        bBot.branches.catchAll(() => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('act')
      })
      it('does respond if branch responds', async () => {
        bBot.branches.custom(() => true, (b) => b.respond('test'))
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('respond')
      })
      it('does not respond without adapter', async () => {
        delete bBot.adapters.loaded.message
        bBot.branches.custom(() => true, (b) => b.respond('test'))
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('respond')
      })
      it('respond updates envelope with matched branch ID', async () => {
        bBot.branches.custom(() => true, (b) => b.respond('test'), { id: 'test' })
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.envelopes![0].branchId).to.equal('test')
      })
      it('respond passes message to nlu adapter', async () => {
        bBot.branches.custom(() => true, (b) => b.respond('test'))
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        const envelope = b.envelopes![0]
        sinon.assert.calledWithExactly((bBot.adapters.loaded.message!.dispatch as sinon.SinonStub), envelope)
      })
      it('remembers user when branch matched', async () => {
        bBot.memory.users = {}
        bBot.branches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(bBot.memory.users[b.message.user.id]).to.eql(message.user)
      })
      it('remembers user when branch matched', async () => {
        bBot.memory.users = {}
        bBot.branches.custom(() => false, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(typeof bBot.memory.users[b.message.user.id]).to.equal('undefined')
      })
      it('does remember when branch matched', async () => {
        bBot.branches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('remember')
      })
      it('does not remember without adapter', async () => {
        bBot.branches.custom(() => true, () => null)
        delete bBot.adapters.loaded.storage
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember when branch unmatched', async () => {
        bBot.branches.custom(() => false, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does remember on dispatch, without branch', async () => {
        const b = new State({ message })
        b.respondEnvelope().write('ping')
        await new Thoughts(b).start('dispatch')
        expect(b.processed).to.include.keys('remember')
      })
      it('does not remember on respond', async () => {
        bBot.branches.custom(() => true, () => null)
        const b = new State({ message })
        b.respondEnvelope().write('ping')
        await new Thoughts(b).start('respond')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember dispatch without envelope', async () => {
        const b = new State({ message })
        await new Thoughts(b).start('dispatch')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember when hear interrupted', async () => {
        bBot.middlewares.register('hear', (_, __, done) => done())
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('remember passes state to storage adapter', async () => {
        bBot.branches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        sinon.assert.calledWithExactly(
          (bBot.adapters.loaded.storage!.keep as sinon.SinonStub),
          'states',
          sinon.match({ message })
        )
      })
      it('remember only once with multiple responses', async () => {
        bBot.branches.custom(() => true, (b) => b.respond('A'))
        bBot.branches.custom(() => true, (b) => b.respond('B'), { force: true })
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.envelopes!.map((envelope) => envelope.strings)).to.eql([
          ['A'], ['B']
        ])
        sinon.assert.calledOnce((bBot.adapters.loaded.storage!.keep as sinon.SinonStub))
      })
      describe('.receive', () => {
        it('timestamps all actioned processes', async () => {
          bBot.branches.custom(() => true, (b) => b.respond('ping'))
          const b = await bBot.thoughts.receive(message)
          expect(b.processed).to.have.all.keys('hear', 'listen', 'respond', 'remember')
        })
        it('records initiating sequence and path', async () => {
          const b = await bBot.thoughts.receive(message)
          expect(b.sequence).to.equal('receive')
        })
        it('consecutive calls isolate thought and path', async () => {
          const listenCallback = sinon.spy()
          const understandCallback = sinon.spy()
          bBot.branches.text(/foo/i, listenCallback, {
            id: 'receive-text'
          })
          bBot.branches.customNLU(() => true, understandCallback, {
            id: 'receive-custom-nlu'
          })
          bBot.config.set('nlu-min-length', 2)
          const messageA = bBot.messages.text(bBot.users.create(), 'foo')
          const messageB = bBot.messages.text(bBot.users.create(), 'bar')
          await bBot.thoughts.receive(messageA)
          await bBot.thoughts.receive(messageB)
          sinon.assert.calledOnce(listenCallback)
          sinon.assert.calledOnce(understandCallback)
          bBot.config.unset('nlu-min-length')
        })
      })
      describe('.respond', () => {
        it('timestamps all actioned processes', async () => {
          const b = new State({ message })
          b.respondEnvelope().write('ping')
          await bBot.thoughts.respond(b)
          expect(b.processed).to.have.all.keys('respond')
        })
        it('records initiating sequence and path', async () => {
          const b = new State({ message })
          await bBot.thoughts.respond(b)
          expect(b.sequence).to.equal('respond')
        })
      })
      describe('.dispatch', () => {
        it('timestamps all actioned processes', async () => {
          const envelope = bBot.envelopes.create({ user: bBot.users.create() }).write('hello')
          const b = await bBot.thoughts.dispatch(envelope)
          expect(b.processed).to.have.all.keys('respond', 'remember')
        })
        it('records initiating sequence and path', async () => {
          const envelope = bBot.envelopes.create({ user: bBot.users.create() }).write('hello')
          const b = await bBot.thoughts.dispatch(envelope)
          expect(b.sequence).to.equal('dispatch')
        })
      })
      describe('.serve', () => {
        it('timestamps all actioned processes', async () => {
          const message = bBot.messages.server({ userId: '111', data: {} })
          bBot.branches.server({}, (b) => b.respond('ping'))
          const b = await bBot.thoughts.serve(message, ({} as IContext))
          expect(b.processed).to.have.all.keys('hear', 'serve', 'respond', 'remember')
        })
      })
    })
  })
})
