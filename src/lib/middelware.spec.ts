import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { logger } from './logger'
import { Middleware } from './middleware'
const initLogLevel = logger.level
const delay = (ms) => new Promise((resolve, reject) => setTimeout(resolve, ms))

describe('middleware', () => {
  before(() => logger.level = 'silent')
  after(() => logger.level = initLogLevel)
  describe('.register', () => {
    it('adds a piece to the stack', () => {
      const middleware = new Middleware('complete')
      const piece = (context, next, done) => next()
      middleware.register(piece)
      expect(middleware.stack).to.eql([piece])
    })
  })
  describe('.execute', () => {
    it('returns a promise', () => {
      const middleware = new Middleware('complete')
      const piece = (context, next, done) => next()
      const complete = (context, done) => done()
      const callback = () => null
      middleware.register(piece)
      const promise = middleware.execute({}, complete, callback)
      expect(promise.then).to.be.a('Function')
      return promise
    })
    it('executes synchronous pieces', () => {
      const middleware = new Middleware('complete')
      const piece = sinon.spy((context, next, done) => next())
      const complete = (context, done) => done()
      const callback = () => sinon.assert.calledOnce(piece)
      middleware.register(piece)
      return middleware.execute({}, complete, callback)
    })
    it('executes asynchronous pieces', () => {
      const middleware = new Middleware('complete')
      const piece = sinon.spy((context, next, done) => process.nextTick(() => next()))
      const complete = (context, done) => done()
      const callback = () => sinon.assert.calledOnce(piece)
      middleware.register(piece)
      middleware.execute({}, complete, callback)
    })
    it('executes synchronous pieces in order', () => {
      const middleware = new Middleware('complete')
      const pieceA = sinon.spy((context, next, done) => next())
      const pieceB = sinon.spy((context, next, done) => next())
      const complete = (context, done) => done()
      const callback = () => sinon.assert.callOrder(pieceA, pieceB)
      middleware.register(pieceA)
      middleware.register(pieceB)
      middleware.execute({}, complete, callback)
    })
    it('executes asynchronous pieces in order', () => {
      const middleware = new Middleware('complete')
      const pieceA = sinon.spy((context, next, done) => {
        return delay(20).then(() => next())
      })
      const pieceB = sinon.spy((context, next, done) => {
        return delay(10).then(() => next())
      })
      const complete = (context, done) => done()
      const callback = () => sinon.assert.callOrder(pieceA, pieceB)
      middleware.register(pieceA)
      middleware.register(pieceB)
      return middleware.execute({}, complete, callback)
    })
    it('executes the complete function when there are no other pieces', () => {
      const middleware = new Middleware('complete')
      const complete = sinon.spy((context, done) => done())
      const callback = () => null
      return middleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('executes the complete function when there are other pieces', () => {
      const middleware = new Middleware('complete')
      const piece = (context, next, done) => next()
      const complete = sinon.spy((context, done) => done())
      const callback = () => null
      middleware.register(piece)
      return middleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(complete)
      })
    })
    it('executes the callback after complete function', () => {
      const middleware = new Middleware('complete')
      const piece = (context, next, done) => next()
      const complete = (context, done) => done()
      const callback = sinon.spy()
      middleware.register(piece)
      return middleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(callback)
      })
    })
    it('does not execute complete function if piece throws', () => {
      const middleware = new Middleware('failure')
      const piece = (context, next, done) => {
        throw new Error('test throw')
      }
      const complete = sinon.spy((context, done) => done())
      const callback = () => null
      middleware.register(piece)
      return middleware.execute({}, complete, callback).then(() => {
        sinon.assert.notCalled(complete)
      })
    })
    it('executes callback even if piece throws', () => {
      const middleware = new Middleware('failure')
      const piece = (context, next, done) => {
        throw new Error('test throw')
      }
      const complete = (context, done) => done()
      const callback = sinon.spy(() => null)
      middleware.register(piece)
      return middleware.execute({}, complete, callback).then(() => {
        sinon.assert.calledOnce(callback)
      })
    })
    it('call piece done even if piece throws', () => {
      const middleware = new Middleware('failure')
      const doneA = sinon.spy((done) => done())
      const pieceA = (context, next, done) => next(() => doneA(done))
      const pieceB = (context, next, done) => {
        throw new Error('test throw')
      }
      const complete = (context, done) => done()
      middleware.register(pieceA)
      middleware.register(pieceB)
      return middleware.execute({}, complete, () => {
        sinon.assert.calledOnce(doneA)
      })
    })
    it('calls wrapped done functions after complete', () => {
      const middleware = new Middleware('wrapped')
      const pieceDone = sinon.spy((done) => done())
      const piece = sinon.spy((context, next, done) => next(() => pieceDone(done)))
      const complete = sinon.spy((context, done) => done())
      const callback = sinon.spy(() => null)
      middleware.register(piece)
      return middleware.execute({}, complete, callback).then(() => {
        sinon.assert.callOrder(piece, complete, pieceDone, callback)
      })
    })
    it('calls wrapped done functions in inverse order of pieces', async () => {
      const middleware = new Middleware('failure')
      const doneA = sinon.spy((done) => done())
      const pieceA = (context, next, done) => next(() => doneA(done))
      const doneB = sinon.spy((done) => done())
      const pieceB = (context, next, done) => next(() => doneB(done))
      const complete = sinon.spy((context, done) => done())
      const callback = sinon.spy(() => null)
      middleware.register(pieceA)
      middleware.register(pieceB)
      return middleware.execute({}, complete, callback).then(() => {
        sinon.assert.callOrder(complete, doneB, doneA, callback)
      })
    })
    it('passes context along with any modifications', () => {
      const middleware = new Middleware()
      const context = { pieces: [] }
      const pieceA = (context, next, done) => {
        context.pieces.push('A')
        next()
      }
      const pieceB = (context, next, done) => {
        context.pieces.push('B')
        next()
      }
      const complete = (context, done) => {
        context.pieces.push('C')
        done()
      }
      middleware.register(pieceA)
      middleware.register(pieceB)
      return middleware.execute(context, complete, () => {
        expect(context.pieces).to.eql(['A', 'B', 'C'])
      })
    })
    it('resolves promise with final context', () => {
      const middleware = new Middleware()
      const context = { complete: false }
      const complete = (context, done) => {
        context.complete = true
        done()
      }
      const callback = () => null
      return middleware.execute(context, complete, callback).then((state) => {
        expect(state.complete).to.equal(true)
      })
    })
  })
})
