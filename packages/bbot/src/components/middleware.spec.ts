import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import { users } from './user'
import { TextMessage } from './message'
import { State } from './state'
import { middlewares, Middleware, IPiece, IPieceDone } from './middleware'
import adapters from './adapter'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const message = new TextMessage(users.create({ id: 'mock-user' }), 'foo')

describe('[middleware]', () => {
  before(() => adapters.unloadAll())
  describe('Middleware', () => {
    describe('.register', () => {
      it('adds a piece to the stack', () => {
        const testMiddleware = new Middleware('test')
        const piece: IPiece = (_, next) => next()
        testMiddleware.register(piece)
        expect(testMiddleware.stack).to.eql([piece])
      })
    })
    describe('.execute', () => {
      it('returns a promise', () => {
        const testMiddleware = new Middleware('test')
        const piece: IPiece = (_, next) => next()
        testMiddleware.register(piece)
        const promise = testMiddleware.execute({ message }, () => null)
        expect(promise.then).to.be.a('Function')
        return promise
      })
      it('executes synchronous pieces', () => {
        const testMiddleware = new Middleware('test')
        const spy = sinon.spy()
        testMiddleware.register(spy)
        return testMiddleware.execute({ message }, () => null).then(() => {
          sinon.assert.calledOnce(spy)
        })
      })
      it('executes asynchronous pieces', () => {
        const testMiddleware = new Middleware('test')
        const spy = sinon.spy()
        testMiddleware.register(spy)
        return testMiddleware.execute({ message }, () => null).then(() => {
          sinon.assert.calledOnce(spy)
        })
      })
      it('resolves after asynchronous pieces', async () => {
        const testMiddleware = new Middleware('test')
        const asyncPiece: IPiece = (b: State) => {
          return delay(50).then(() => b.delayed = true)
        }
        testMiddleware.register(asyncPiece)
        const b = await testMiddleware.execute({ message }, () => null)
        expect(b.delayed).to.equal(true)
      })
      it('accepts and processes initialised state', () => {
        const b = new State({ message })
        const testMiddleware = new Middleware('test')
        const complete = (state: State) => expect(state).to.eql(b)
        return testMiddleware.execute(b, complete)
      })
      it('executes synchronous pieces in order', () => {
        const testMiddleware = new Middleware('test')
        const pieceA = sinon.spy()
        const pieceB = sinon.spy()
        const complete = () => null
        testMiddleware.register(pieceA)
        testMiddleware.register(pieceB)
        return testMiddleware.execute({ message }, complete)
      })
      it('executes asynchronous pieces in order', async () => {
        const testMiddleware = new Middleware('test')
        const pieceA: IPiece = (_, next) => {
          delay(20).then(() => next()).catch()
        }
        const pieceB: IPiece = (_, next) => {
          delay(10).then(() => next()).catch()
        }
        const spyA = sinon.spy(pieceA)
        const spyB = sinon.spy(pieceB)
        testMiddleware.register(spyA)
        testMiddleware.register(spyB)
        await testMiddleware.execute({ message }, () => null)
        sinon.assert.callOrder(spyA, spyB)
      })
      it('executes the complete function when there are no other pieces', () => {
        const testMiddleware = new Middleware('test')
        const complete = sinon.spy()
        return testMiddleware.execute({ message }, complete).then(() => {
          sinon.assert.calledOnce(complete)
        })
      })
      it('executes the complete function when there are other pieces', () => {
        const testMiddleware = new Middleware('test')
        const piece: IPiece = (_, next) => next()
        const complete = sinon.spy()
        testMiddleware.register(piece)
        return testMiddleware.execute({ message }, complete).then(() => {
          sinon.assert.calledOnce(complete)
        })
      })
      it('rejects promise if piece throws', () => {
        const testMiddleware = new Middleware('failure')
        const piece: IPiece = () => { throw new Error('test throw') }
        const complete = sinon.spy()
        testMiddleware.register(piece)
        return testMiddleware.execute({ message }, complete)
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err).to.be.an('Error'))
      })
      it('does not execute complete function if piece throws', () => {
        const testMiddleware = new Middleware('failure')
        const piece: IPiece = () => { throw new Error('test throw') }
        const complete = sinon.spy()
        testMiddleware.register(piece)
        return testMiddleware.execute({ message }, complete)
          .then(() => expect(true).to.equal(false))
          .catch(() => sinon.assert.notCalled(complete))
      })
      it('does not execute complete function if piece interrupts', async () => {
        const testMiddleware = new Middleware('interrupt')
        const piece: IPiece = (_, __, done) => done()
        const complete = sinon.spy()
        testMiddleware.register(piece)
        await testMiddleware.execute({ message }, complete)
        sinon.assert.notCalled(complete)
      })
      it('resolves promise if piece interrupts', () => {
        const testMiddleware = new Middleware('interrupt')
        let tracker = false
        const piece: IPiece = (_, __, done) => {
          tracker = true
          done()
        }
        const complete = sinon.spy()
        testMiddleware.register(piece)
        return testMiddleware.execute({ message }, complete).then(() => {
          expect(tracker).to.equal(true)
        })
      })
      it('calls wrapped done functions after complete', () => {
        const testMiddleware = new Middleware('wrapped')
        const pieceDone: IPieceDone = (done) => (done) ? done() : null
        const doneSpy = sinon.spy(pieceDone)
        const piece: IPiece = (_, next, done) => next(() => doneSpy(done))
        const pieceSpy = sinon.spy(piece)
        const completeSpy = sinon.spy()
        testMiddleware.register(pieceSpy)
        return testMiddleware.execute({ message }, completeSpy).then(() => {
          sinon.assert.callOrder(pieceSpy, completeSpy, doneSpy)
        })
      })
      it('calls wrapped done functions in inverse order of pieces', async () => {
        const testMiddleware = new Middleware('failure')
        const doneA = sinon.spy((done: any) => done())
        const pieceA = (_: any, next: any, done: any) => next(() => doneA(done))
        const doneB = sinon.spy((done: any) => done())
        const pieceB = (_: any, next: any, done: any) => next(() => doneB(done))
        const complete = sinon.spy()
        testMiddleware.register(pieceA)
        testMiddleware.register(pieceB)
        return testMiddleware.execute({ message }, complete).then(() => {
          sinon.assert.callOrder(complete, doneB, doneA)
        })
      })
      it('passes state along with any modifications', async () => {
        const testMiddleware = new Middleware()
        const state = new State({ message, pieces: [] })
        const pieceA = (b: State, next: any) => {
          b.pieces.push('A')
          next()
        }
        const pieceB = (b: State, next: any) => {
          b.pieces.push('B')
          next()
        }
        const complete = (b: State) => b.pieces.push('C')
        testMiddleware.register(pieceA)
        testMiddleware.register(pieceB)
        await testMiddleware.execute(state, complete)
        expect(state.pieces).to.eql(['A', 'B', 'C'])
      })
      it('resolves promise with final state', () => {
        const testMiddleware = new Middleware()
        const b = { message, complete: false }
        const complete = (b: State) => b.complete = true
        return testMiddleware.execute(b, complete).then((b) => {
          expect(b.complete).to.equal(true)
        })
      })
    })
  })
  describe('MiddlewareController', () => {
    describe('.loadAll', () => {
      it('creates middleware for each thought process', () => {
        middlewares.loadAll()
        expect(middlewares.stacks).to.include.all.keys([
          'hear', 'listen', 'understand', 'act', 'respond', 'remember'
        ])
      })
      it('creates all middleware instances', () => {
        middlewares.loadAll()
        for (let key in middlewares.stacks) {
          expect(middlewares.stacks[key]).to.be.instanceof(Middleware)
        }
      })
    })
    describe('.unloadAll', () => {
      it('deletes all middleware instances', () => {
        middlewares.loadAll()
        middlewares.unloadAll()
        expect(middlewares.stacks).to.eql({})
      })
    })
    describe('.register', () => {
      it('registers piece in hear stack', () => {
        middlewares.loadAll()
        const mockPiece = sinon.spy()
        middlewares.register('hear', mockPiece)
        expect(middlewares.stacks.hear!.stack[0]).to.eql(mockPiece)
      })
      it('registers piece in listen stack', () => {
        middlewares.loadAll()
        const mockPiece = sinon.spy()
        middlewares.register('listen', mockPiece)
        expect(middlewares.stacks.listen!.stack[0]).to.eql(mockPiece)
      })
      it('registers piece in understand stack', () => {
        middlewares.loadAll()
        const mockPiece = sinon.spy()
        middlewares.register('understand', mockPiece)
        expect(middlewares.stacks.understand!.stack[0]).to.eql(mockPiece)
      })
      it('registers piece in act stack', () => {
        middlewares.loadAll()
        const mockPiece = sinon.spy()
        middlewares.register('act', mockPiece)
        expect(middlewares.stacks.act!.stack[0]).to.eql(mockPiece)
      })
      it('registers piece in respond stack', () => {
        middlewares.loadAll()
        const mockPiece = sinon.spy()
        middlewares.register('respond', mockPiece)
        expect(middlewares.stacks.respond!.stack[0]).to.eql(mockPiece)
      })
      it('registers piece in remember stack', () => {
        middlewares.loadAll()
        const mockPiece = sinon.spy()
        middlewares.register('remember', mockPiece)
        expect(middlewares.stacks.remember!.stack[0]).to.eql(mockPiece)
      })
    })
  })
})
