import 'mocha'
import { expect } from 'chai'
import * as bot from '..'
import * as message from './message'

let mockUser: bot.User

describe('[message]', () => {
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
})
