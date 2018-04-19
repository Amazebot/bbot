import 'mocha'
import sinon from 'sinon'
import * as bot from '../..'
import { expect } from 'chai'
import { MessageAdapter } from './message'

const log = sinon.spy(bot.logger, 'debug')
class MockAdapter extends MessageAdapter {
  name = 'mock-message-adapter'
  async start () { /* mock start */ }
  async shutdown () { /* mock shutdown */ }
}
const mockAdapter = new MockAdapter(bot)

describe('message adapter', () => {
  beforeEach(() => log.resetHistory())
  describe('constructor', () => {
    it('allows extending', () => {
      expect(mockAdapter).to.be.instanceof(MessageAdapter)
    })
  })
  describe('.receive', () => {
    it('logs debug', async () => {
      await mockAdapter.receive('testing')
      sinon.assert.calledWithMatch(log, /receive/, { message: 'testing' })
    })
  })
  describe('.send', () => {
    it('logs debug', async () => {
      await mockAdapter.send({ user: { name: 'tester' } }, 'testing')
      sinon.assert.calledWithMatch(log, /send/, { strings: ['testing'] })
    })
  })
  describe('.reply', () => {
    it('logs debug', async () => {
      await mockAdapter.reply({ user: { name: 'tester' } }, 'testing')
      sinon.assert.calledWithMatch(log, /reply/, { strings: ['testing'] })
    })
  })
  describe('.emote', () => {
    it('logs debug', async () => {
      await mockAdapter.emote({ user: { name: 'tester' } }, 'testing')
      sinon.assert.calledWithMatch(log, /emote/, { strings: ['testing'] })
    })
  })
  describe('.emote', () => {
    it('logs debug', async () => {
      await mockAdapter.emote({ user: { name: 'tester' } }, 'testing')
      sinon.assert.calledWithMatch(log, /emote/, { strings: ['testing'] })
    })
  })
  describe('.topic', () => {
    it('logs debug', async () => {
      await mockAdapter.topic({ user: { name: 'tester' } }, 'testing')
      sinon.assert.calledWithMatch(log, /topic/, { strings: ['testing'] })
    })
  })
  describe('.notify', () => {
    it('logs debug', async () => {
      await mockAdapter.notify({ user: { name: 'tester' } }, 'testing')
      sinon.assert.calledWithMatch(log, /notify/, { strings: ['testing'] })
    })
  })
  describe('.play', () => {
    it('logs debug', async () => {
      await mockAdapter.play({ user: { name: 'tester' } }, 'testing')
      sinon.assert.calledWithMatch(log, /play/, { strings: ['testing'] })
    })
  })
})
