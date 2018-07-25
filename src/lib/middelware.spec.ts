import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as middleware from './middleware'
import * as bot from '..'

const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))
let message: bot.TextMessage

describe('middleware', () => {
  before(() => {
    message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
  })
  beforeEach(() => middleware.unloadMiddleware())
  describe('.register', () => {
    it('adds a piece to the stack', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece = (b, next, done) => next()
      testMiddleware.register(piece)
      expect(testMiddleware.stack).to.eql([piece])
    })
  })
  describe('.execute', () => {
    it('returns a promise', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece = (b, next, done) => next()
      const complete = (b) => null
      testMiddleware.register(piece)
      const promise = testMiddleware.execute({ message }, complete)
      expect(promise.then).to.be.a('Function')
      return promise
    })
    it('executes synchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece = sinon.spy((b, next, done) => next())
      const complete = (b) => null
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete)
    })
    it('executes asynchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece = sinon.spy((b, next, done) => process.nextTick(() => next()))
      const complete = (b) => null
      testMiddleware.register(piece)
      testMiddleware.execute({ message }, complete)
    })
    it('resolves after asynchronous pieces', async () => {
      const testMiddleware = new middleware.Middleware('test')
      const asyncPiece = (b, next, done) => {
        return delay(50).then(() => {
          b.delayed = true
          next()
        })
      }
      testMiddleware.register(asyncPiece)
      const b = await testMiddleware.execute({ message }, (b) => null)
      expect(b.delayed).to.equal(true)
    })
    it('creates state when given plain object', () => {
      const testMiddleware = new middleware.Middleware('test')
      const piece = sinon.spy((b, next, done) => next())
      const complete = (b) => {
        expect(b).to.be.instanceof(bot.State)
      }
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete)
    })
    it('accepts and processes initialised state', () => {
      const b = new bot.State({ message })
      const testMiddleware = new middleware.Middleware('test')
      const piece = sinon.spy((b, next, done) => next())
      const complete = (b) => expect(b).to.eql(b)
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete)
    })
    it('executes synchronous pieces in order', () => {
      const testMiddleware = new middleware.Middleware('test')
      const pieceA = sinon.spy((b, next, done) => next())
      const pieceB = sinon.spy((b, next, done) => next())
      const complete = (b) => null
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      testMiddleware.execute({ message }, complete)
    })
    it('executes asynchronous pieces in order', async () => {
      const testMiddleware = new middleware.Middleware('test')
      const pieceA = sinon.spy((b, next, done) => {
        return delay(20).then(() => next())
      })
      const pieceB = sinon.spy((b, next, done) => {
        return delay(10).then(() => next())
      })
      const complete = (b) => null
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      await testMiddleware.execute({ message }, complete)
      sinon.assert.callOrder(pieceA, pieceB)
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
      const piece = (b, next, done) => next()
      const complete = sinon.spy()
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('rejects promise if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const piece = (b, next, done) => {
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
      const piece = (b, next, done) => {
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
      const piece = (_, __, done) => done()
      const complete = sinon.spy()
      testMiddleware.register(piece)
      await testMiddleware.execute({ message }, complete)
      sinon.assert.notCalled(complete)
    })
    it('resolves promise if piece interrupts', () => {
      const testMiddleware = new middleware.Middleware('interrupt')
      let tracker = false
      const piece = (_, __, done) => {
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
      const pieceDone = sinon.spy((done) => done())
      const piece = sinon.spy((b, next, done) => next(() => pieceDone(done)))
      const complete = sinon.spy((b) => null)
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete).then(() => {
        sinon.assert.callOrder(piece, complete, pieceDone)
      })
    })
    it('calls wrapped done functions in inverse order of pieces', async () => {
      const testMiddleware = new middleware.Middleware('failure')
      const doneA = sinon.spy((done) => done())
      const pieceA = (b, next, done) => next(() => doneA(done))
      const doneB = sinon.spy((done) => done())
      const pieceB = (b, next, done) => next(() => doneB(done))
      const complete = sinon.spy((b) => null)
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({ message }, complete).then(() => {
        sinon.assert.callOrder(complete, doneB, doneA)
      })
    })
    it('passes state along with any modifications', async () => {
      const testMiddleware = new middleware.Middleware()
      const b = { message, pieces: [] }
      const pieceA = (b, next, done) => {
        b.pieces.push('A')
        next()
      }
      const pieceB = (b, next, done) => {
        b.pieces.push('B')
        next()
      }
      const complete = (b) => b.pieces.push('C')
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      await testMiddleware.execute(b, complete)
      expect(b.pieces).to.eql(['A', 'B', 'C'])
    })
    it('resolves promise with final state', () => {
      const testMiddleware = new middleware.Middleware()
      const b = { message, complete: false }
      const complete = (b) => b.complete = true
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
