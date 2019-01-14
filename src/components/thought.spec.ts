import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import config from '../util/config'
import { users } from './user'
import { messages, CatchAllMessage } from './message'
import { NLUResult } from './nlu'
import { branches as globalBranches, CustomBranch, BranchController } from './branch'
import { State } from './state'
import { envelopes } from './envelope'
import { middlewares, Middleware } from './middleware'
import { IContext } from './server'
import { adapters, abstracts } from './adapter'
import { memory } from './memory'
import { thoughts, Thought, Thoughts } from './thought'

import bBot from '../bot'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
class MockMessenger extends abstracts.MessageAdapter {
  name = 'mock-messenger'
  async dispatch () { return }
  async start () { return }
  async shutdown () { return }
}
class MockNLU extends abstracts.NLUAdapter {
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
class MockStorage extends abstracts.StorageAdapter {
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
    globalBranches.reset()
    middlewares.unloadAll()
    adapters.unloadAll()
    adapters.loaded.message = sinon.createStubInstance(MockMessenger)
  })
  describe('Thought', () => {
    describe('constructor', () => {
      it('creates corresponding middleware', async () => {
        const b = new State({ message })
        const name = 'thoughts-test'
        const thought = new Thought({ name, b })
        expect(thought.middleware).to.be.instanceOf(Middleware)
        expect(middlewares.stacks).to.have.property('thoughts-test')
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
      it('false from validate passed through to action', async () => {
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
      context('middleware incomplete', () => {
        it('adds timestamp if middleware complete', async () => {
          const b = new State({ message })
          const name = 'test'
          const middlewarePiece = (_: any, next: any) => next()
          const middleware = new Middleware('test')
          middleware.register(middlewarePiece)
          await new Thought({ name, b, middleware }).process()
          expect(b.processed).to.include.keys('test')
        })
      })
      context('middleware completed', () => {
        it('action called only once', async () => {
          const action = sinon.spy()
          const b = new State({ message })
          const name = 'test'
          const middlewarePiece = (_: any, next: any) => next()
          const middleware = new Middleware('test')
          middleware.register(middlewarePiece)
          await new Thought({ name, b, middleware, action }).process()
          sinon.assert.calledOnce(action)
        })
        it('no timestamp', async () => {
          const b = new State({ message })
          const name = 'test'
          const middlewarePiece = (_: any, __: any, done: any) => done()
          const middleware = new Middleware('test')
          middleware.register(middlewarePiece)
          await new Thought({ name, b, middleware }).process()
          expect(b.processed).to.not.include.keys('test')
        })
      })
      context('with branches', () => {
        it('calls validate, then middleware, then branch callback, then action', async () => {
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
        it('exits if empty branch collection', async () => {
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
        it('no timestamp if state already done', async () => {
          const b = new State({ message, done: true })
          const name = 'test'
          const middleware = new Middleware('test')
          const branches = {
            test: new CustomBranch(() => true, () => null)
          }
          await new Thought({ name, b, middleware, branches }).process()
          expect(typeof b.processed.test).to.equal('undefined')
        })
        it('calls consecutive branches if forced', async () => {
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
        it('stops processing when state done', async () => {
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
      })
      it('with middleware name, processes existing middleware', async () => {
        middlewares.register('hear', (b, _, __) => b.hearTest = true)
        const b = new State({ message })
        const thought = new Thought({ name: 'hear', b })
        await thought.process()
        expect(b.hearTest).to.equal(true)
      })
      it('with unknown name, uses new middleware', async () => {
        const b = new State({ message })
        const thought = await new Thought({ name: 'test-thought', b })
        expect(middlewares.stacks).to.have.property('test-thought')
        const middleware = middlewares.stacks['test-thought']!
        const execute = sinon.spy(middleware, 'execute')
        await thought.process()
        sinon.assert.calledOnce(execute)
      })
    })
  })
  describe('Thoughts', () => {
    describe('.start', () => {
      it('receive records initiating sequence', async () => {
        const b = await new Thoughts(new State({ message }))
          .start('receive')
        expect(b.sequence).to.equal('receive')
      })
      it('with path, processes branches', async () => {
        let listens: string[] = []
        const branches = new BranchController()
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
        let listens: string[] = []
        const branches = new BranchController()
        globalBranches.custom(() => true, () => listens.push('A'), { force: true })
        branches.custom(() => true, () => listens.push('B'), { force: true })
        branches.custom(() => true, () => listens.push('C'), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(listens).to.eql(['B', 'C'])
      })
      it('continues to following branches after branch responds', async () => {
        let processed = false
        const branches = new BranchController()
        branches.custom(() => true, (b) => b.respond('foo'))
        branches.custom(() => true, () => (processed = true), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('continues to following branches after async callback', async () => {
        let processed = false
        const branches = new BranchController()
        branches.custom(() => true, () => delay(50))
        branches.custom(() => true, () => (processed = true), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('continues to following branches after async matcher', async () => {
        let processed = false
        const branches = new BranchController()
        branches.custom(() => delay(50).then(() => true), () => null)
        branches.custom(() => true, () => (processed = true), { force: true })
        await new Thoughts(new State({ message }), branches)
          .start('receive')
        expect(processed).to.equal(true)
      })
      it('without branches, uses global branches', async () => {
        let listens: string[] = []
        globalBranches.custom(() => true, () => listens.push('A'))
        await new Thoughts(new State({ message })).start('receive')
        expect(listens).to.eql(['A'])
      })
      it('does hear', async () => {
        middlewares.register('hear', (b, _, __) => b.hearTest = true)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b).to.have.property('hearTest', true)
      })
      it('does listen when hear uninterrupted', async () => {
        globalBranches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('listen')
      })
      it('does not listen when hear interrupted', async () => {
        globalBranches.custom(() => true, () => null)
        middlewares.register('hear', (_, __, done) => done())
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('listen')
      })
      it('calls post-process action if interrupted, not ignored', async () => {
        middlewares.register('hear', (_: any, __: any, done: any) => {
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
        middlewares.register('hear', (_: any, __: any, done: any) => {
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
        adapters.loaded.nlu = new MockNLU(bBot)
        globalBranches.custom(() => false, () => null)
        globalBranches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('understand')
      })
      it('understand passes message to NLU adapter', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        adapters.loaded.nlu.process = sinon.spy()
        globalBranches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        sinon.assert.calledWithExactly((adapters.loaded.nlu!.process as sinon.SinonSpy), message)
      })
      it('understand branches include NLU results from adapter', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        adapters.loaded.nlu!.process = async () => {
          return { intent: new NLUResult().add({ id: 'test' }) }
        }
        globalBranches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.message.nlu!.results.intent).to.eql([{ id: 'test' }])
      })
      it('does not understand without adapter', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        globalBranches.custom(() => false, () => null)
        globalBranches.customNLU(() => true, () => null)
        delete adapters.loaded.nlu
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand when listen matched', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        globalBranches.custom(() => true, () => null)
        globalBranches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand when message text is empty', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        adapters.loaded.nlu.process = sinon.spy()
        globalBranches.customNLU(() => true, () => null)
        const empty = messages.text(users.create(), '                   ')
        const b = new State({ message: empty })
        await new Thoughts(b).start('receive')
        sinon.assert.notCalled((adapters.loaded.nlu!.process as sinon.SinonSpy))
      })
      it('does not understand when message too short', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        adapters.loaded.nlu.process = sinon.spy()
        config.set('nlu-min-length', 99)
        globalBranches.customNLU(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        config.unset('nlu-min-length')
        sinon.assert.notCalled((adapters.loaded.nlu!.process as sinon.SinonSpy))
      })
      it('does not understand when hear interrupted', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        globalBranches.customNLU(() => true, () => null)
        middlewares.register('hear', (_, __, done) => done())
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('does not understand non-text messages', async () => {
        adapters.loaded.nlu = new MockNLU(bBot)
        globalBranches.customNLU(() => true, () => null)
        const b = new State({ message: messages.enter(users.create()) })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('understand')
      })
      it('act replaces message with catch all', async () => {
        globalBranches.catchAll(() => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.message instanceof CatchAllMessage).to.equal(true)
      })
      it('does not act when text branch matched', async () => {
        globalBranches.custom(() => true, () => null)
        globalBranches.catchAll(() => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('act')
      })
      it('does not act when NLU branch matched', async () => {
        globalBranches.customNLU(() => true, () => null)
        globalBranches.catchAll(() => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('act')
      })
      it('does respond if branch responds', async () => {
        globalBranches.custom(() => true, (b) => b.respond('test'))
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('respond')
      })
      it('respond updates envelope with matched branch ID', async () => {
        globalBranches.custom(() => true, (b) => b.respond('test'), { id: 'test' })
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.envelopes![0].branchId).to.equal('test')
      })
      context('without message adapter', () => {
        beforeEach(() => delete adapters.loaded.message)
        it('does not respond', async () => {
          globalBranches.custom(() => true, (b) => b.respond('test'))
          const b = new State({ message })
          await new Thoughts(b).start('receive')
          expect(b.processed).to.not.include.keys('respond')
        })
      })
      context('with nlu adapter', () => {
        beforeEach(() => adapters.loaded.nlu = new MockNLU(bBot))
        it('respond passes message to nlu adapter', async () => {
          globalBranches.custom(() => true, (b) => b.respond('test'))
          const b = new State({ message })
          await new Thoughts(b).start('receive')
          const envelope = b.envelopes![0]
          sinon.assert.calledWithExactly((adapters.loaded.message!.dispatch as sinon.SinonStub), envelope)
        })
        it('does act when listen unmatched', async () => {
          globalBranches.custom(() => false, () => null)
          globalBranches.customNLU(() => false, () => null)
          globalBranches.catchAll(() => null)
          const b = new State({ message })
          await new Thoughts(b).start('receive')
          expect(b.processed).to.include.keys('act')
        })
      })
      it('remembers user when branch matched', async () => {
        memory.users = {}
        globalBranches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(memory.users[b.message.user.id]).to.eql(message.user)
      })
      it('remembers user when branch matched', async () => {
        memory.users = {}
        globalBranches.custom(() => false, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(typeof memory.users[b.message.user.id]).to.equal('undefined')
      })
      it('does remember when branch matched', async () => {
        adapters.loaded.storage = sinon.createStubInstance(MockStorage)
        globalBranches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.include.keys('remember')
      })
      it('does not remember without adapter', async () => {
        globalBranches.custom(() => true, () => null)
        delete adapters.loaded.storage
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember when branch unmatched', async () => {
        adapters.loaded.storage = sinon.createStubInstance(MockStorage)
        globalBranches.custom(() => false, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does remember on dispatch, without branch', async () => {
        adapters.loaded.storage = sinon.createStubInstance(MockStorage)
        const b = new State({ message })
        b.respondEnvelope().write('ping')
        await new Thoughts(b).start('dispatch')
        expect(b.processed).to.include.keys('remember')
      })
      it('does not remember on respond', async () => {
        adapters.loaded.storage = sinon.createStubInstance(MockStorage)
        globalBranches.custom(() => true, () => null)
        const b = new State({ message })
        b.respondEnvelope().write('ping')
        await new Thoughts(b).start('respond')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember dispatch without envelope', async () => {
        adapters.loaded.storage = sinon.createStubInstance(MockStorage)
        const b = new State({ message })
        await new Thoughts(b).start('dispatch')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('does not remember when hear interrupted', async () => {
        middlewares.register('hear', (_, __, done) => done())
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.processed).to.not.include.keys('remember')
      })
      it('remember passes state to storage adapter', async () => {
        adapters.loaded.storage = sinon.createStubInstance(MockStorage)
        const keep = adapters.loaded.storage.keep as sinon.SinonStub
        globalBranches.custom(() => true, () => null)
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        sinon.assert.calledWithExactly(keep, 'states', sinon.match({ message }))
      })
      it('remember only once with multiple responses', async () => {
        adapters.loaded.storage = sinon.createStubInstance(MockStorage)
        const keep = adapters.loaded.storage.keep as sinon.SinonStub
        globalBranches.custom(() => true, (b) => b.respond('A'))
        globalBranches.custom(() => true, (b) => b.respond('B'), { force: true })
        const b = new State({ message })
        await new Thoughts(b).start('receive')
        expect(b.envelopes!.map((envelope) => envelope.strings)).to.eql([
          ['A'], ['B']
        ])
        sinon.assert.calledOnce(keep)
      })
      describe('.receive', () => {
        it('timestamps all actioned processes', async () => {
          globalBranches.custom(() => true, (b) => b.respond('ping'))
          const b = await thoughts.receive(message)
          expect(b.processed).to.have.all.keys('hear', 'listen', 'respond', 'remember')
        })
        it('records initiating sequence and path', async () => {
          const b = await thoughts.receive(message)
          expect(b.sequence).to.equal('receive')
        })
        it('consecutive calls isolate thought and path', async () => {
          const listenCallback = sinon.spy()
          const understandCallback = sinon.spy()
          globalBranches.text(/foo/i, listenCallback, {
            id: 'receive-text'
          })
          globalBranches.customNLU(() => true, understandCallback, {
            id: 'receive-custom-nlu'
          })
          config.set('nlu-min-length', 2)
          const messageA = messages.text(users.create(), 'foo')
          const messageB = messages.text(users.create(), 'bar')
          await thoughts.receive(messageA)
          await thoughts.receive(messageB)
          sinon.assert.calledOnce(listenCallback)
          sinon.assert.calledOnce(understandCallback)
          config.unset('nlu-min-length')
        })
      })
      describe('.respond', () => {
        it('timestamps all actioned processes', async () => {
          const b = new State({ message })
          b.respondEnvelope().write('ping')
          await thoughts.respond(b)
          expect(b.processed).to.have.all.keys('respond')
        })
        it('records initiating sequence and path', async () => {
          const b = new State({ message })
          await thoughts.respond(b)
          expect(b.sequence).to.equal('respond')
        })
      })
      describe('.dispatch', () => {
        it('timestamps all actioned processes', async () => {
          const envelope = envelopes.create({ user: users.create() }).write('hello')
          const b = await thoughts.dispatch(envelope)
          expect(b.processed).to.have.all.keys('respond', 'remember')
        })
        it('records initiating sequence and path', async () => {
          const envelope = envelopes.create({ user: users.create() }).write('hello')
          const b = await thoughts.dispatch(envelope)
          expect(b.sequence).to.equal('dispatch')
        })
      })
      describe('.serve', () => {
        it('timestamps all actioned processes', async () => {
          const message = messages.server({ userId: '111', data: {} })
          globalBranches.server({}, (b) => b.respond('ping'))
          const b = await thoughts.serve(message, ({} as IContext))
          expect(b.processed).to.have.all.keys('hear', 'serve', 'respond', 'remember')
        })
      })
    })
  })
})
