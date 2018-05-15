import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'
import * as thought from './thought-process'

// Mock for initial state object
const message = new bot.TextMessage(new bot.User('test-user'), 'foo')

describe('thought-process', () => {
  beforeEach(() => bot.loadMiddleware())
  describe('.hear', () => {
    it('calls callback before resolving', async () => {
      const callback = sinon.spy()
      await thought.hear(message, callback)
      sinon.assert.calledOnce(callback)
    })
    it('proceeds to listen when middleware passes', async () => {
      const callback = sinon.spy()
      bot.middlewares.hear.register((b, next, done) => next())
      bot.listenText(/.*/, () => null, { id: 'test-listener' })
      const listener = bot.listeners['test-listener']
      const processSpy = sinon.spy(listener, 'process')
      await thought.hear(message)
      sinon.assert.calledOnce(processSpy)
    })
    it('does not proceed to listen if middleware interrupted', async () => {
      const callback = sinon.spy()
      bot.middlewares.hear.register((b, next, done) => done())
      bot.listenText(/.*/, () => null, { id: 'test-listener' })
      const listener = bot.listeners['test-listener']
      const processSpy = sinon.spy(listener, 'process')
      await thought.hear(message)
      sinon.assert.notCalled(processSpy)
    })
  })
})
