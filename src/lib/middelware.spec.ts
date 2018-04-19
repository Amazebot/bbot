import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as middleware from './middleware'
const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

describe('middleware', () => {
  beforeEach(() => middleware.unloadMiddleware())
  describe('.register', () => {
    it('adds a piece to the stack', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (state, next, done) => next()
      testMiddleware.register(piece)
      expect(testMiddleware.stack).to.eql([piece])
    })
  })
  describe('.execute', () => {
    it('returns a promise', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (state, next, done) => next()
      const complete = (state, done) => done()
      const callback = () => null
      testMiddleware.register(piece)
      const promise = testMiddleware.execute({}, complete, callback)
      expect(promise.then).to.be.a('Function')
      return promise
    })
    it('executes synchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = sinon.spy((state, next, done) => next())
      const complete = (state, done) => done()
      const callback = () => sinon.assert.calledOnce(piece)
      testMiddleware.register(piece)
      return testMiddleware.execute({}, complete, callback)
    })
    it('executes asynchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = sinon.spy((state, next, done) => process.nextTick(() => next()))
      const complete = (state, done) => done()
      const callback = () => sinon.assert.calledOnce(piece)
      testMiddleware.register(piece)
      testMiddleware.execute({}, complete, callback)
    })
    it('executes synchronous pieces in order', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const pieceA = sinon.spy((state, next, done) => next())
      const pieceB = sinon.spy((state, next, done) => next())
      const complete = (state, done) => done()
      const callback = () => sinon.assert.callOrder(pieceA, pieceB)
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      testMiddleware.execute({}, complete, callback)
    })
    it('executes asynchronous pieces in order', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const pieceA = sinon.spy((state, next, done) => {
        return delay(20).then(() => next())
      })
      const pieceB = sinon.spy((state, next, done) => {
        return delay(10).then(() => next())
      })
      const complete = (state, done) => done()
      const callback = () => sinon.assert.callOrder(pieceA, pieceB)
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({}, complete, callback)
    })
    it('executes the complete function when there are no other pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const complete = sinon.spy((state, done) => done())
      const callback = () => null
      return testMiddleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('executes the complete function when there are other pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (state, next, done) => next()
      const complete = sinon.spy((state, done) => done())
      const callback = () => null
      testMiddleware.register(piece)
      return testMiddleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('executes the callback after complete function', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (state, next, done) => next()
      const complete = (state, done) => done()
      const callback = sinon.spy()
      testMiddleware.register(piece)
      return testMiddleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(callback)
      })
    })
    it('does not execute complete function if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const piece = (state, next, done) => {
        throw new Error('test throw')
      }
      const complete = sinon.spy((state, done) => done())
      const callback = () => null
      testMiddleware.register(piece)
      return testMiddleware.execute({}, complete, callback).then(() => {
        sinon.assert.notCalled(complete)
      })
    })
    it('executes callback even if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const piece = (state, next, done) => {
        throw new Error('test throw')
      }
      const complete = (state, done) => done()
      const callback = sinon.spy(() => null)
      testMiddleware.register(piece)
      return testMiddleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(callback)
      })
    })
    it('call piece done even if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const doneA = sinon.spy((done) => done())
      const pieceA = (state, next, done) => next(() => doneA(done))
      const pieceB = (state, next, done) => {
        throw new Error('test throw')
      }
      const complete = (state, done) => done()
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({}, complete, () => {
        sinon.assert.calledOnce(doneA)
      })
    })
    it('calls wrapped done functions after complete', () => {
      const testMiddleware = new middleware.Middleware('wrapped')
      const pieceDone = sinon.spy((done) => done())
      const piece = sinon.spy((state, next, done) => next(() => pieceDone(done)))
      const complete = sinon.spy((state, done) => done())
      const callback = sinon.spy(() => null)
      testMiddleware.register(piece)
      return testMiddleware.execute({}, complete, callback).then(() => {
        sinon.assert.callOrder(piece, complete, pieceDone, callback)
      })
    })
    it('calls wrapped done functions in inverse order of pieces', async () => {
      const testMiddleware = new middleware.Middleware('failure')
      const doneA = sinon.spy((done) => done())
      const pieceA = (state, next, done) => next(() => doneA(done))
      const doneB = sinon.spy((done) => done())
      const pieceB = (state, next, done) => next(() => doneB(done))
      const complete = sinon.spy((state, done) => done())
      const callback = sinon.spy(() => null)
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({}, complete, callback).then(() => {
        sinon.assert.callOrder(complete, doneB, doneA, callback)
      })
    })
    it('passes state along with any modifications', () => {
      const testMiddleware = new middleware.Middleware()
      const state = { pieces: [] }
      const pieceA = (state, next, done) => {
        state.pieces.push('A')
        next()
      }
      const pieceB = (state, next, done) => {
        state.pieces.push('B')
        next()
      }
      const complete = (state, done) => {
        state.pieces.push('C')
        done()
      }
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute(state, complete, () => {
        expect(state.pieces).to.eql(['A', 'B', 'C'])
      })
    })
    it('resolves promise with final state', () => {
      const testMiddleware = new middleware.Middleware()
      const state = { complete: false }
      const complete = (state, done) => {
        state.complete = true
        done()
      }
      const callback = () => null
      return testMiddleware.execute(state, complete, callback).then((state) => {
        expect(state.complete).to.equal(true)
      })
    })
  })
  describe('.loadMiddleware', () => {
    it('creates middleware for each thought process', () => {
      middleware.loadMiddleware()
      expect(middleware.middlewares).to.include.all.keys([
        'hear', 'listen', 'understand', 'respond', 'remember'
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
