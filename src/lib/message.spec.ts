import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'
import * as message from './message'

let mockUser: bot.User

describe('message', () => {
  before(() => mockUser = new bot.User({ id: 'TEST_ID', name: 'testy' }))
  describe('Message', () => {
    it('allows extending', () => {
      class MockMessage extends message.Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage).to.be.instanceof(message.Message)
    })
    it('accepts user for property', () => {
      class MockMessage extends message.Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage).to.have.property('user', mockUser)
    })
    it('creates user from object', () => {
      class MockMessage extends message.Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage({ name: 'testy' })
      expect(mockMessage.user).to.be.instanceof(bot.User)
    })
    it('accepts ID if given', () => {
      class MockMessage extends message.Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser, 'TEST_ID')
      expect(mockMessage.id).to.equal('TEST_ID')
    })
    it('assigns ID if not given', () => {
      class MockMessage extends message.Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage.id).to.have.lengthOf(32)
    })
  })
  describe('TextMessage', () => {
    it('.toString returns text', () => {
      const textMessage = new message.TextMessage(mockUser, 'test txt')
      expect(textMessage.toString()).to.equal('test txt')
    })
  })
  describe('EnterMessage', () => {
    it('.toString returns event and user', () => {
      const enterMessage = new message.EnterMessage(mockUser, 'test txt')
      expect(enterMessage.toString()).to.equal(`enter message for ${mockUser.name}`)
    })
  })
  describe('LeaveMessage', () => {
    it('.toString returns event and user', () => {
      const leaveMessage = new message.LeaveMessage(mockUser, 'test txt')
      expect(leaveMessage.toString()).to.equal(`leave message for ${mockUser.name}`)
    })
  })
  describe('TopicMessage', () => {
    it('.toString returns event and user', () => {
      const topicMessage = new message.TopicMessage(mockUser, 'test txt')
      expect(topicMessage.toString()).to.equal(`topic message for ${mockUser.name}`)
    })
  })
  describe('CatchAllMessage', () => {
    it('inherits original message properties', () => {
      const textMessage = new message.TextMessage(mockUser, 'test txt')
      const catchMessage = new message.CatchAllMessage(textMessage)
      expect(catchMessage.id).to.equal(textMessage.id)
      expect(catchMessage.toString()).to.equal(textMessage.toString())
    })
  })
  describe('Envelope', () => {
    it('.write adds strings to envelope', () => {
      const envelope = new message.Envelope().write('Test 1', 'Test 2')
      expect(envelope.strings).to.eql(['Test 1', 'Test 2'])
    })
    it('.write concatenates existing strings with cumulative calls', () => {
      const envelope = new message.Envelope()
      envelope.write('Test 1', 'Test 2')
      envelope.write('Test 3')
      expect(envelope.strings).to.eql(['Test 1', 'Test 2', 'Test 3'])
    })
    it('.attach adds payload content to envelope', () => {
      const envelope = new message.Envelope().attach({ foo: 'bar' })
      expect(envelope.payload).to.eql({ foo: 'bar' })
    })
    it('.attach can build payload with cumulative calls', () => {
      const envelope = new message.Envelope()
      envelope.attach({ foo: 'bar' })
      envelope.attach({ baz: 'qux' })
      expect(envelope.payload).to.eql({ foo: 'bar', baz: 'qux' })
    })
  })
  describe('.createEnvelope', () => {
    it('addresses new envelope to user', () => {
      const user = new bot.User({ id: 'test-user' })
      const envelope = bot.createEnvelope({ user })
      expect(envelope.user).to.eql(user)
    })
    it('addresses envelope to user room if set', () => {
      const room = { id: 'test-room', name: 'testing' }
      const user = new bot.User({ id: 'test-user', room })
      const envelope = bot.createEnvelope({ user })
      expect(envelope.room).to.eql(room)
    })
    it('addresses to room if given directly', () => {
      const room = { id: 'test-room', name: 'testing' }
      const user = new bot.User({ id: 'test-user' })
      const envelope = bot.createEnvelope({ user, room })
      expect(envelope.room).to.eql(room)
    })
    it('given room overrules user room', () => {
      const room = { id: 'test-room', name: 'testing' }
      const user = new bot.User({ id: 'test-user', room: { id: 'dm-room' } })
      const envelope = bot.createEnvelope({ user, room })
      expect(envelope.room).to.eql(room)
    })
  })
  describe('.responseEnvelope', () => {
    it('addresses envelope to message origin from state', () => {
      const user = new bot.User({ id: 'test-user', room: { id: 'dm-room' } })
      const message = new bot.TextMessage(user, 'Testing...')
      const b = new bot.B({ message })
      const envelope = bot.responseEnvelope(b)
      expect(envelope.room).to.eql(message.user.room)
      expect(envelope.message).to.eql(message)
      expect(envelope.user).to.eql(message.user)
    })
  })
})
