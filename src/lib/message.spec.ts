import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { User } from './user'
import * as message from './message'

const mockUser = new User('TEST_ID', { name: 'testy' })

describe('message', () => {
  describe('Message', () => {
    it('allows extending', () => {
      class MockMessage extends message.Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage).to.be.instanceof(message.Message)
    })
    it('inherits basic properties', () => {
      class MockMessage extends message.Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage).to.include.all.keys([ 'id', 'user' ])
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
