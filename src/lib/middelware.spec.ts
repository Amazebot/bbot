import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as middleware from './middleware'
import * as bot from '..'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
let message: bot.TextMessage

describe('middleware', () => {
  before(() => {
    message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
  })
  beforeEach(() => middleware.unloadMiddleware())
  describe('.register', () => {
    it('adds a piece to the stack', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece: bot.IPiece = (_, next) => next()
      testMiddleware.register(piece)
      expect(testMiddleware.stack).to.eql([piece])
    })
  })
  describe('.execute', () => {
    it('returns a promise', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece: bot.IPiece = (_, next) => next()
      testMiddleware.register(piece)
      const promise = testMiddleware.execute({ message }, () => null)
      expect(promise.then).to.be.a('Function')
      return promise
    })
    it('executes synchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('test')
      const spy = sinon.spy()
      testMiddleware.register(spy)
      return testMiddleware.execute({ message }, () => null).then(() => {
        sinon.assert.calledOnce(spy)
      })
    })
    it('executes asynchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('test')
      const spy = sinon.spy()
      testMiddleware.register(spy)
      return testMiddleware.execute({ message }, () => null).then(() => {
        sinon.assert.calledOnce(spy)
      })
    })
    it('resolves after asynchronous pieces', async () => {
      const testMiddleware = new middleware.Middleware('test')
      const asyncPiece: bot.IPiece = (b: bot.State) => {
        return delay(50).then(() => b.delayed = true)
      }
      testMiddleware.register(asyncPiece)
      const b = await testMiddleware.execute({ message }, () => null)
      expect(b.delayed).to.equal(true)
    })
    it('accepts and processes initialised state', () => {
      const b = new bot.State({ message })
      const testMiddleware = new middleware.Middleware('test')
      const complete = (state: bot.State) => expect(state).to.eql(b)
      return testMiddleware.execute(b, complete)
    })
    it('executes synchronous pieces in order', () => {
      const testMiddleware = new middleware.Middleware('test')
      const pieceA = sinon.spy()
      const pieceB = sinon.spy()
      const complete = () => null
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({ message }, complete)
    })
    it('executes asynchronous pieces in order', async () => {
      const testMiddleware = new middleware.Middleware('test')
      const pieceA: bot.IPiece = (_, next) => {
        delay(20).then(() => next()).catch()
      }
      const pieceB: bot.IPiece = (_, next) => {
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
      const testMiddleware = new middleware.Middleware('test')
      const complete = sinon.spy()
      return testMiddleware.execute({ message }, complete).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('executes the complete function when there are other pieces', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece: bot.IPiece = (_, next) => next()
      const complete = sinon.spy()
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('rejects promise if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const piece: bot.IPiece = () => {
        throw new Error('test throw')
      }
      const complete = sinon.spy()
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete)
        .then(() => expect(true).to.equal(false))
        .catch((err) => expect(err).to.be.an('Error'))
    })
    it('does not execute complete function if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const piece: bot.IPiece = () => {
        throw new Error('test throw')
      }
      const complete = sinon.spy()
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete)
        .then(() => expect(true).to.equal(false))
        .catch(() => sinon.assert.notCalled(complete))
    })
    it('does not execute complete function if piece interrupts', async () => {
      const testMiddleware = new middleware.Middleware('interrupt')
      const piece: bot.IPiece = (_, __, done) => done()
      const complete = sinon.spy()
      testMiddleware.register(piece)
      await testMiddleware.execute({ message }, complete)
      sinon.assert.notCalled(complete)
    })
    it('resolves promise if piece interrupts', () => {
      const testMiddleware = new middleware.Middleware('interrupt')
      let tracker = false
      const piece: bot.IPiece = (_, __, done) => {
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
      const testMiddleware = new middleware.Middleware('wrapped')
      const pieceDone: bot.IPieceDone = (done) => (done) ? done() : null
      const doneSpy = sinon.spy(pieceDone)
      const piece: bot.IPiece = (_, next, done) => next(() => doneSpy(done))
      const pieceSpy = sinon.spy(piece)
      const completeSpy = sinon.spy()
      testMiddleware.register(pieceSpy)
      return testMiddleware.execute({ message }, completeSpy).then(() => {
        sinon.assert.callOrder(pieceSpy, completeSpy, doneSpy)
      })
    })
    it('calls wrapped done functions in inverse order of pieces', async () => {
      const testMiddleware = new middleware.Middleware('failure')
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
      const testMiddleware = new middleware.Middleware()
      const b = { message, pieces: [] }
      const pieceA = (b: bot.State, next: any) => {
        b.pieces.push('A')
        next()
      }
      const pieceB = (b: bot.State, next: any) => {
        b.pieces.push('B')
        next()
      }
      const complete = (b: bot.State) => b.pieces.push('C')
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      await testMiddleware.execute(b, complete)
      expect(b.pieces).to.eql(['A', 'B', 'C'])
    })
    it('resolves promise with final state', () => {
      const testMiddleware = new middleware.Middleware()
      const b = { message, complete: false }
      const complete = (b: bot.State) => b.complete = true
      return testMiddleware.execute(b, complete).then((b) => {
        expect(b.complete).to.equal(true)
      })
    })
  })
  describe('.loadMiddleware', () => {
    it('creates middleware for each thought process', () => {
      middleware.loadMiddleware()
      expect(middleware.middlewares).to.include.all.keys([
        'hear', 'listen', 'understand', 'act', 'respond', 'remember'
      ])
    })
    it('creates all middleware instances', () => {
      middleware.loadMiddleware()
      for (let key in middleware.middlewares) {
        expect(middleware.middlewares[key]).to.be.instanceof(middleware.Middleware)
      }
    })
  })
  describe('.unloadMiddleware', () => {
    it('deletes all middleware instances', () => {
      middleware.loadMiddleware()
      middleware.unloadMiddleware()
      expect(middleware.middlewares).to.eql({})
    })
  })
  describe('.hearMiddleware', () => {
    it('registers piece in hear stack', () => {
      middleware.loadMiddleware()
      const mockPiece = sinon.spy()
      middleware.hearMiddleware(mockPiece)
      expect(middleware.middlewares.hear.stack[0]).to.eql(mockPiece)
    })
  })
  describe('.listenMiddleware', () => {
    it('registers piece in listen stack', () => {
      middleware.loadMiddleware()
      const mockPiece = sinon.spy()
      middleware.listenMiddleware(mockPiece)
      expect(middleware.middlewares.listen.stack[0]).to.eql(mockPiece)
    })
  })
  describe('.understandMiddleware', () => {
    it('registers piece in understand stack', () => {
      middleware.loadMiddleware()
      const mockPiece = sinon.spy()
      middleware.understandMiddleware(mockPiece)
      expect(middleware.middlewares.understand.stack[0]).to.eql(mockPiece)
    })
  })
  describe('.actMiddleware', () => {
    it('registers piece in act stack', () => {
      middleware.loadMiddleware()
      const mockPiece = sinon.spy()
      middleware.actMiddleware(mockPiece)
      expect(middleware.middlewares.act.stack[0]).to.eql(mockPiece)
    })
  })
  describe('.respondMiddleware', () => {
    it('registers piece in respond stack', () => {
      middleware.loadMiddleware()
      const mockPiece = sinon.spy()
      middleware.respondMiddleware(mockPiece)
      expect(middleware.middlewares.respond.stack[0]).to.eql(mockPiece)
    })
  })
  describe('.rememberMiddleware', () => {
    it('registers piece in remember stack', () => {
      middleware.loadMiddleware()
      const mockPiece = sinon.spy()
      middleware.rememberMiddleware(mockPiece)
      expect(middleware.middlewares.remember.stack[0]).to.eql(mockPiece)
    })
  })
})
