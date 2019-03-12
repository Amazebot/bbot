import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import config from '../util/config'
import { users } from './user'
import { messages, CatchAllMessage, ServerMessage } from './message'
import { branches as globalBranches, CustomBranch } from './branch'
import { State } from './state'
import { dialogues, Dialogue } from './dialogue'
import { IContext } from './server'
import { envelopes } from './envelope'
import { middlewares, Middleware } from './middleware'
import { adapters } from './adapter'
import { memory } from './memory'
import { store } from './store'
import { Thought, Thoughts, ThoughtController } from './thought'

import * as mock from '../test/mock'
import { delay /*, debug*/ } from '../test/utils'
const message = mock.textMessage()

// debug() // 👈 route logs to console for more informative tests

const stubThoughtProcesses = (thoughts: Thoughts) => {
  const processes: { [key: string]: sinon.SinonStub } = {} // for sequence stubs
  for (let key of Object.keys(thoughts.processes)) {
    processes[key] = sinon.stub(thoughts.processes[key], 'process' as any)
  }
  return processes
}

describe('[thought]', () => {
  beforeEach(async () => {
    globalBranches.reset()
    middlewares.unloadAll()
    adapters.unloadAll()
    dialogues.reset()
    mock.adapters.reset()
    adapters.loaded.message = mock.adapters.message
    adapters.loaded.nlu = mock.adapters.nlu
    adapters.loaded.storage = mock.adapters.storage
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
      context('with middleware', () => {
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
      })
      context('with middleware name', () => {
        it('processes existing middleware', async () => {
          middlewares.register('hear', (b, _, __) => b.hearTest = true)
          const b = new State({ message })
          const thought = new Thought({ name: 'hear', b })
          await thought.process()
          expect(b.hearTest).to.equal(true)
        })
        it('with unknown name, uses new middleware', async () => {
          const b = new State({ message })
          const thought = new Thought({ name: 'test-thought', b })
          expect(middlewares.stacks).to.have.property('test-thought')
          const middleware = middlewares.stacks['test-thought']!
          const execute = sinon.spy(middleware, 'execute')
          await thought.process()
          sinon.assert.calledOnce(execute)
        })
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
        it('processes forced branches after response', async () => {
          const b = new State({ message })
          const name = 'test'
          const middleware = new Middleware('test')
          const callback = sinon.spy()
          const branches = {
            'A': new CustomBranch(() => true, (b) => b.respond('foo')),
            'B': new CustomBranch(() => true, callback, { force: true })
          }
          await new Thought({ name, b, middleware, branches }).process()
          sinon.assert.calledOnce(callback)
        })
        it('processes branches after async callback', async () => {
          const b = new State({ message })
          const name = 'test'
          const middleware = new Middleware('test')
          const callback = sinon.spy()
          const branches = {
            'A': new CustomBranch(() => true, () => delay(50)),
            'B': new CustomBranch(() => true, callback, { force: true })
          }
          await new Thought({ name, b, middleware, branches }).process()
          sinon.assert.calledOnce(callback)
        })
        it('processes branches after async matcher', async () => {
          const b = new State({ message })
          const name = 'test'
          const middleware = new Middleware('test')
          const callback = sinon.spy()
          const branches = {
            'A': new CustomBranch(() => delay(50).then(() => true), () => null),
            'B': new CustomBranch(() => true, callback, { force: true })
          }
          await new Thought({ name, b, middleware, branches }).process()
          sinon.assert.calledOnce(callback)
        })
      })
    })
  })
  describe('Thoughts', () => {
    describe('constructor', () => {
      it('without branches uses global branches', async () => {
        globalBranches.custom(() => true, () => null)
        const thoughts = new Thoughts(new State({ message }))
        expect(thoughts.branches).to.eql(globalBranches)
      })
    })
    describe('.start', () => {
      context('"receive"', () => {
        it('initiating sequence added to state', async () => {
          const b = await new Thoughts(new State({ message })).start('receive')
          expect(b.sequence).to.equal('receive')
        })
        it('process hear, listen, understand, act, remember', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const processes = stubThoughtProcesses(thoughts)
          await thoughts.start('receive')
          sinon.assert.callOrder(
            processes['hear'],
            processes['listen'],
            processes['understand'],
            processes['act'],
            processes['remember']
          )
        })
        it('process remember only once with multiple responses', async () => {
          globalBranches.custom(() => true, (b) => b.respond('A'))
          globalBranches.custom(() => true, (b) => b.respond('B'), { force: true })
          const thoughts = new Thoughts(new State({ message }))
          const processes = stubThoughtProcesses(thoughts)
          await thoughts.start('receive')
          sinon.assert.calledOnce(processes['remember'])
        })
        it('timestamps all actioned processes (with branches)', async () => {
          globalBranches.custom(() => true, () => null)
          globalBranches.customNLU(() => true, () => null, { force: true })
          globalBranches.catchAll((b) => b.respond('test'), { force: true })
          const thoughts = new Thoughts(new State({ message }))
          const b = await thoughts.start('receive')
          expect(b.processed).to.have.all.keys(
            'hear',
            'listen',
            'understand',
            'act',
            'respond',
            'remember'
          )
        })
        it('timestamps all actioned processes (without branches)', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const b = await thoughts.start('receive')
          expect(b.processed).to.have.all.keys(
            'hear',
            'remember'
          )
        })
      })
      context('"serve"', () => {
        it('initiating sequence added to state', async () => {
          const b = await new Thoughts(new State({ message })).start('serve')
          expect(b.sequence).to.equal('serve')
        })
        it('process hear, serve, act, remember', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const processes = stubThoughtProcesses(thoughts)
          await thoughts.start('serve')
          sinon.assert.callOrder(
            processes['hear'],
            processes['serve'],
            processes['act'],
            processes['remember']
          )
        })
        it('timestamps all actioned processes (with branches)', async () => {
          globalBranches.customServer(() => true, (b) => b.respond('test'))
          const thoughts = new Thoughts(new State({ message }))
          const b = await thoughts.start('serve')
          expect(b.processed).to.have.all.keys(
            'hear',
            'serve',
            'respond',
            'remember'
          )
        })
      })
      context('"respond"', () => {
        it('initiating sequence added to state', async () => {
          const b = await new Thoughts(new State({ message })).start('respond')
          expect(b.sequence).to.equal('respond')
        })
        it('process respond', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const processes = stubThoughtProcesses(thoughts)
          await thoughts.start('respond')
          sinon.assert.callOrder(
            processes['respond']
          )
        })
        it('timestamps all actioned processes', async () => {
          const thoughts = new Thoughts(new State({ message }))
          await thoughts.b.respond('test')
          const b = await thoughts.start('respond')
          expect(b.processed).to.have.all.keys('respond')
        })
        it('does not process remember', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const processes = stubThoughtProcesses(thoughts)
          await thoughts.start('respond')
          sinon.assert.notCalled(processes.remember)
        })
      })
      context('"dispatch"', () => {
        it('initiating sequence added to state', async () => {
          const b = await new Thoughts(new State({ message })).start('dispatch')
          expect(b.sequence).to.equal('dispatch')
        })
        it('process respond, remember', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const processes = stubThoughtProcesses(thoughts)
          await thoughts.start('dispatch')
          sinon.assert.callOrder(
            processes['respond'],
            processes['remember']
          )
        })
        it('timestamps all actioned processes', async () => {
          const thoughts = new Thoughts(new State({ message }))
          globalBranches.custom(() => true, () => null)
          thoughts.b.envelope.compose('test')
          const b = await thoughts.start('dispatch')
          expect(b.processed).to.have.all.keys(
            'respond',
            'remember'
          )
        })
      })
    })
    describe('.processes', () => {
      describe('.hear.action', () => {
        context('on success', () => {
          it('continues with state', () => {
            const b = new State({ message })
            const thoughts = new Thoughts(b)
            thoughts.processes.hear.action(true)
            expect(b.exit).to.equal(undefined)
          })
        })
        context('on fail', () => {
          it('finishes with state', () => {
            const b = new State({ message })
            const thoughts = new Thoughts(b)
            thoughts.processes.hear.action(false)
            expect(b.done).to.equal(true)
          })
        })
      })
      describe('.listen.action', () => {
        context('on success', () => {
          it('removes unforced NLU', async () => {
            globalBranches.customNLU(() => true, () => null, { force: true })
            globalBranches.customNLU(() => true, () => null)
            const thoughts = new Thoughts(new State({ message }))
            thoughts.processes.listen.action(true)
            expect(Object.keys(thoughts.branches.understand)).to.have.lengthOf(1)
          })
        })
        context('on fail', () => {
          it('retains all NLU branches', async () => {
            globalBranches.customNLU(() => true, () => null, { force: true })
            globalBranches.customNLU(() => true, () => null)
            const thoughts = new Thoughts(new State({ message }))
            await thoughts.processes.listen.action(false)
            expect(Object.keys(globalBranches.understand)).to.have.lengthOf(2)
          })
        })
      })
      describe('understand.validate', () => {
        it('false if no adapter', async () => {
          adapters.loaded.nlu = undefined
          const thoughts = new Thoughts(new State({ message }))
          const valid = await thoughts.processes.understand.validate()
          expect(valid).to.equal(false)
        })
        it('false if message text empty', async () => {
          const empty = messages.text(users.create(), '                   ')
          const thoughts = new Thoughts(new State({ message: empty }))
          const valid = await thoughts.processes.understand.validate()
          expect(valid).to.equal(false)
        })
        it('false if message too short', async () => {
          config.set('nlu-min-length', 99)
          const thoughts = new Thoughts(new State({ message }))
          const valid = await thoughts.processes.understand.validate()
          expect(valid).to.equal(false)
          config.unset('nlu-min-length')
        })
        it('false if non-text message', async () => {
          const enter = messages.enter(users.create())
          const thoughts = new Thoughts(new State({ message: enter }))
          const valid = await thoughts.processes.understand.validate()
          expect(valid).to.equal(false)
        })
        it('true passes message to NLU adapter', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const valid = await thoughts.processes.understand.validate()
          expect(valid).to.equal(true)
          sinon.assert.calledWithExactly(
            (adapters.loaded.nlu!.process as sinon.SinonStub),
            message
          )
        })
        it('true NLU result added to message', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const valid = await thoughts.processes.understand.validate()
          expect(valid).to.equal(true)
          expect(thoughts.b.message.nlu!.results).to.eql(mock.data.nlu)
        })
      })
      describe('.act.validate', () => {
        it('false if branch matched', async () => {
          globalBranches.catchAll(() => null)
          const thoughts = new Thoughts(new State({ message }))
          thoughts.b.matching = [new CustomBranch(() => true, () => null)]
          const valid = await thoughts.processes.act.validate()
          expect(valid).to.equal(false)
        })
        it('false if no catch all branches', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const valid = await thoughts.processes.act.validate()
          expect(valid).to.equal(false)
        })
        it('true replaces message with catch all', async () => {
          globalBranches.catchAll(() => null)
          const thoughts = new Thoughts(new State({ message }))
          const valid = await thoughts.processes.act.validate()
          expect(valid).to.equal(true)
          expect(thoughts.b.message instanceof CatchAllMessage).to.equal(true)
        })
      })
      describe('.respond.validate', () => {
        it('false without envelope', async () => {
          const thoughts = new Thoughts(new State({ message }))
          const valid = await thoughts.processes.respond.validate()
          expect(valid).to.equal(false)
        })
        it('false without message adapter', async () => {
          adapters.loaded.message = undefined
          const thoughts = new Thoughts(new State({ message }))
          thoughts.b.envelope.compose('test')
          const valid = await thoughts.processes.respond.validate()
          expect(valid).to.equal(false)
        })
        it('true updates envelope with matched branch ID', async () => {
          globalBranches.custom(() => false, () => null)
          const thoughts = new Thoughts(new State({ message }))
          thoughts.b.envelope.compose('test')
          thoughts.b.matching = [new CustomBranch(() => true, () => null, { id: 'test' })]
          await thoughts.processes.listen.process()
          const valid = await thoughts.processes.respond.validate()
          expect(valid).to.equal(true)
          expect(thoughts.b.envelopes![0].branchId).to.equal('test')
        })
      })
      describe('.respond.action', () => {
        context('on success', () => {
          it('dispatches envelope to message adapter', async () => {
            const thoughts = new Thoughts(new State({ message }))
            const envelope = thoughts.b.envelope.compose('test')
            await thoughts.processes.respond.action(true)
            sinon.assert.calledWithExactly(
              (adapters.loaded.message!.dispatch as sinon.SinonStub),
              envelope
            )
          })
        })
      })
      describe('.remember.validate', () => {
        it('remembers user when branch matched', async () => {
          memory.users = {}
          const thoughts = new Thoughts(new State({ message }))
          thoughts.b.matching = [new CustomBranch(() => true, () => null)]
          await thoughts.processes.remember.validate()
          expect(memory.users[message.user.id]).to.eql(message.user)
        })
        it('false if no adapter', async () => {
          adapters.loaded.storage = undefined
          const thoughts = new Thoughts(new State({ message }))
          thoughts.b.matching = [new CustomBranch(() => true, () => null)]
          const valid = await thoughts.processes.remember.validate()
          expect(valid).to.equal(false)
        })
      })
      describe('.remember.action', () => {
        context('on success', () => {
          it('keeps state in memory store', async () => {
            const spy = sinon.stub(store, 'keep')
            const thoughts = new Thoughts(new State({ message }))
            await thoughts.processes.remember.action(true)
            sinon.assert.calledWithExactly(spy, 'states', thoughts.b)
            spy.restore()
          })
        })
      })
    })
  })
  describe('ThoughtController', () => {
    describe('.receive', () => {
      it('creates state for message', async () => {
        const thoughts = new ThoughtController()
        const b = await thoughts.receive(message)
        expect(b.message).to.eql(message)
      })
      it('initiates receive thought process', async () => {
        globalBranches.custom(() => true, () => null)
        globalBranches.catchAll(() => null, { force: true })
        const thoughts = new ThoughtController()
        const b = await thoughts.receive(message)
        expect(b.processed).to.have.keys('hear', 'listen', 'act', 'remember')
      })
      it('use branches from dialogue if user engaged', async () => {
        const dlg = new Dialogue()
        await dlg.open(new State({ message }))
        dlg.branches.custom(() => true, () => null)
        const thoughts = new ThoughtController()
        const b = await thoughts.receive(message)
        expect(b.branches).to.eql(dlg.branches)
      })
    })
    describe('.serve', () => {
      it('creates state for message', async () => {
        const message = new ServerMessage({
          userId: 'mock-user',
          data: { foo: 'bar' }
        })
        const thoughts = new ThoughtController()
        const b = await thoughts.serve(message, {} as IContext)
        expect(b.message).to.eql(message)
      })
      it('initiates serve thought process', async () => {
        globalBranches.customServer(() => true, () => null)
        globalBranches.catchAll(() => null, { force: true })
        const message = new ServerMessage({
          userId: 'mock-user',
          data: { foo: 'bar' }
        })
        const thoughts = new ThoughtController()
        const b = await thoughts.serve(message, {} as IContext)
        expect(b.processed).to.have.keys('hear', 'serve', 'act', 'remember')
      })
      it('use branches from dialogue if user engaged', async () => {
        const message = new ServerMessage({
          userId: 'mock-user',
          data: { foo: 'bar' }
        })
        const dlg = new Dialogue()
        await dlg.open(new State({ message }))
        const bId = dlg.branches.customServer(() => true, () => null)
        const branch = dlg.branches.serve[bId]
        const thoughts = new ThoughtController()
        const b = await thoughts.serve(message, {} as IContext)
        expect(b.matchingBranch).to.eql(branch)
      })
    })
    describe('.respond', () => {
      it('initiates respond thought process', async () => {
        const thoughts = new ThoughtController()
        const b = new State({ message })
        b.envelope.compose('test')
        await thoughts.respond(b)
        expect(b.processed).to.have.keys('respond')
      })
    })
    describe('.dispatch', () => {
      it('initiates respond thought process', async () => {
        const thoughts = new ThoughtController()
        const b = await thoughts.dispatch(envelopes.create())
        expect(b.processed).to.have.keys('respond', 'remember')
      })
    })
  })
})
