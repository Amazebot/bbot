import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as middleware from './middleware'
import * as bot from '..'
const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))
const message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')

describe('middleware', () => {
  beforeEach(() => middleware.unloadMiddleware())
  describe('.register', () => {
    it('adds a piece to the stack', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (b, next, done) => next()
      testMiddleware.register(piece)
      expect(testMiddleware.stack).to.eql([piece])
    })
  })
  describe('.execute', () => {
    it('returns a promise', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (b, next, done) => next()
      const complete = (b, done) => done()
      const callback = () => null
      testMiddleware.register(piece)
      const promise = testMiddleware.execute({ message }, complete, callback)
      expect(promise.then).to.be.a('Function')
      return promise
    })
    it('executes synchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = sinon.spy((b, next, done) => next())
      const complete = (b, done) => done()
      const callback = () => sinon.assert.calledOnce(piece)
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete, callback)
    })
    it('executes asynchronous pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = sinon.spy((b, next, done) => process.nextTick(() => next()))
      const complete = (b, done) => done()
      const callback = () => sinon.assert.calledOnce(piece)
      testMiddleware.register(piece)
      testMiddleware.execute({ message }, complete, callback)
    })
    it('creates state when given plain object', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = sinon.spy((b, next, done) => next())
      const complete = (b, done) => {
        expect(b).to.be.instanceof(bot.B)
        done()
      }
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete)
    })
    it('accepts and processes initialised state', () => {
      const b = new bot.B({ message })
      const testMiddleware = new middleware.Middleware('complete')
      const piece = sinon.spy((b, next, done) => next())
      const complete = (b, done) => {
        expect(b).to.eql(b)
        done()
      }
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete)
    })
    it('executes synchronous pieces in order', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const pieceA = sinon.spy((b, next, done) => next())
      const pieceB = sinon.spy((b, next, done) => next())
      const complete = (b, done) => done()
      const callback = () => sinon.assert.callOrder(pieceA, pieceB)
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      testMiddleware.execute({ message }, complete, callback)
    })
    it('executes asynchronous pieces in order', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const pieceA = sinon.spy((b, next, done) => {
        return delay(20).then(() => next())
      })
      const pieceB = sinon.spy((b, next, done) => {
        return delay(10).then(() => next())
      })
      const complete = (b, done) => done()
      const callback = () => sinon.assert.callOrder(pieceA, pieceB)
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({ message }, complete, callback)
    })
    it('executes the complete function when there are no other pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const complete = sinon.spy((b, done) => done())
      const callback = () => null
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('executes the callback when there are no pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const complete = (b, done) => done()
      const callback = sinon.spy()
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.calledOnce(callback)
      })
    })
    it('executes the complete function when there are other pieces', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (b, next, done) => next()
      const complete = sinon.spy((b, done) => done())
      const callback = () => null
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('executes the callback after complete function', () => {
      const testMiddleware = new middleware.Middleware('complete')
      const piece = (b, next, done) => next()
      const complete = (b, done) => done()
      const callback = sinon.spy()
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.calledOnce(callback)
      })
    })
    it('does not execute complete function if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const piece = (b, next, done) => {
        throw new Error('test throw')
      }
      const complete = sinon.spy((b, done) => done())
      const callback = () => null
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.notCalled(complete)
      })
    })
    it('executes callback even if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const piece = (b, next, done) => {
        throw new Error('test throw')
      }
      const complete = (b, done) => done()
      const callback = sinon.spy(() => null)
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.calledOnce(callback)
      })
    })
    it('call piece done even if piece throws', () => {
      const testMiddleware = new middleware.Middleware('failure')
      const doneA = sinon.spy((done) => done())
      const pieceA = (b, next, done) => next(() => doneA(done))
      const pieceB = (b, next, done) => {
        throw new Error('test throw')
      }
      const complete = (b, done) => done()
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({ message }, complete, () => {
        sinon.assert.calledOnce(doneA)
      })
    })
    it('calls wrapped done functions after complete', () => {
      const testMiddleware = new middleware.Middleware('wrapped')
      const pieceDone = sinon.spy((done) => done())
      const piece = sinon.spy((b, next, done) => next(() => pieceDone(done)))
      const complete = sinon.spy((b, done) => done())
      const callback = sinon.spy(() => null)
      testMiddleware.register(piece)
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.callOrder(piece, complete, pieceDone, callback)
      })
    })
    it('calls wrapped done functions in inverse order of pieces', async () => {
      const testMiddleware = new middleware.Middleware('failure')
      const doneA = sinon.spy((done) => done())
      const pieceA = (b, next, done) => next(() => doneA(done))
      const doneB = sinon.spy((done) => done())
      const pieceB = (b, next, done) => next(() => doneB(done))
      const complete = sinon.spy((b, done) => done())
      const callback = sinon.spy(() => null)
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute({ message }, complete, callback).then(() => {
        sinon.assert.callOrder(complete, doneB, doneA, callback)
      })
    })
    it('passes state along with any modifications', () => {
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
      const complete = (b, done) => {
        b.pieces.push('C')
        done()
      }
      testMiddleware.register(pieceA)
      testMiddleware.register(pieceB)
      return testMiddleware.execute(b, complete, () => {
        expect(b.pieces).to.eql(['A', 'B', 'C'])
      })
    })
    it('resolves promise with final state', () => {
      const testMiddleware = new middleware.Middleware()
      const b = { message, complete: false }
      const complete = (b, done) => {
        b.complete = true
        done()
      }
      const callback = () => null
      return testMiddleware.execute(b, complete, callback).then((b) => {
        expect(b.complete).to.equal(true)
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
