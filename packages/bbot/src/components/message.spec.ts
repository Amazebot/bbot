import 'mocha'
import { expect } from 'chai'
import { users, User } from './user'
import {
  Message,
  TextMessage,
  EnterMessage,
  LeaveMessage,
  TopicMessage,
  CatchAllMessage,
  ServerMessage
} from './message'

let mockUser: User

describe('[message]', () => {
  before(() => mockUser = users.create({ id: 'TEST_ID', name: 'testy' }))
  describe('Message', () => {
    it('allows extending', () => {
      class MockMessage extends Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage).to.be.instanceof(Message)
    })
    it('can clone, without altering original', () => {
      class MockMessage extends Message {
        toString () { return 'original' }
      }
      const original = new MockMessage(mockUser)
      const clone = original.clone()
      clone.toString = () => 'clone'
      expect(original.toString()).to.equal('original')
      expect(clone.toString()).to.equal('clone')
    })
    it('accepts user for property', () => {
      class MockMessage extends Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage).to.have.property('user', mockUser)
    })
    it('creates user from object', () => {
      class MockMessage extends Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage({ name: 'testy' })
      expect(mockMessage.user).to.be.instanceof(User)
    })
    it('accepts ID if given', () => {
      class MockMessage extends Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser, 'TEST_ID')
      expect(mockMessage.id).to.equal('TEST_ID')
    })
    it('assigns ID if not given', () => {
      class MockMessage extends Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage.id).to.have.lengthOf(32)
    })
    it('type property returns class name', () => {
      class MockMessage extends Message {
        toString () { return 'test' }
      }
      const mockMessage = new MockMessage(mockUser)
      expect(mockMessage.type).to.equal('MockMessage')
    })
  })
  describe('Text', () => {
    it('.toString returns text', () => {
      const textMessage = new TextMessage(mockUser, 'test txt')
      expect(textMessage.toString()).to.equal('test txt')
    })
  })
  describe('Enter', () => {
    it('.toString returns event and user', () => {
      const enterMessage = new EnterMessage(mockUser, 'test txt')
      expect(enterMessage.toString()).to.equal(`enter message for ${mockUser.name}`)
    })
  })
  describe('Leave', () => {
    it('.toString returns event and user', () => {
      const leaveMessage = new LeaveMessage(mockUser, 'test txt')
      expect(leaveMessage.toString()).to.equal(`leave message for ${mockUser.name}`)
    })
  })
  describe('Topic', () => {
    it('.toString returns event and user', () => {
      const topicMessage = new TopicMessage(mockUser, 'test txt')
      expect(topicMessage.toString()).to.equal(`topic message for ${mockUser.name}`)
    })
  })
  describe('CatchAll', () => {
    it('constructor inherits original message properties', () => {
      const textMessage = new TextMessage(mockUser, 'test txt')
      const catchMessage = new CatchAllMessage(textMessage)
      expect(catchMessage.id).to.equal(textMessage.id)
      expect(catchMessage.toString()).to.equal(textMessage.toString())
    })
    it('type returns the original message type', () => {
      const textMessage = new TextMessage(mockUser, 'test txt')
      const catchMessage = new CatchAllMessage(textMessage)
      expect(catchMessage.type).to.equal('TextMessage')
    })
  })
  describe('Server', () => {
    it('constructor gets user from ID', () => {
      users.byId(mockUser.id, mockUser) // make user known
      const requestMessage = new ServerMessage({
        userId: mockUser.id,
        data: { foo: 'bar' }
      })
      expect(requestMessage.user).to.eql(mockUser)
    })
    it('.toString prints JSON data', () => {
      const requestMessage = new ServerMessage({
        userId: mockUser.id,
        data: { foo: 'bar' }
      })
      expect(requestMessage.toString()).to.match(/foo.*?bar/)
    })
  })
})
