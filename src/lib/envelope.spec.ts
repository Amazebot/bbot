import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

const testRoom = {
  id: '111',
  name: 'testing'
}
const testRoomDM = {
  id: '222',
  name: 'tester-direct'
}
const testUser = new bot.User({ name: 'tester', room: testRoomDM })

describe('[envelope]', () => {
  describe('Envelope', () => {
    it('defaults provide method, id and blank room', () => {
      const envelope = new bot.Envelope()
      expect(Object.keys(envelope)).to.eql(['id', 'method', 'room'])
      expect(envelope.method).to.equal('send')
      expect(envelope.id).to.have.lengthOf(32)
      expect(envelope.room).to.eql({})
    })
    it('given user room and room, addresses to the room', () => {
      const envelope = new bot.Envelope({ user: testUser, room: testRoom })
      expect(envelope.room).to.eql(testRoom)
    })
    it('given just user, addresses to the user\'s room', () => {
      const envelope = new bot.Envelope({ user: testUser })
      expect(envelope.room).to.eql(testRoomDM)
    })
    it('given just room, user is unset', () => {
      const envelope = new bot.Envelope({ room: testRoom })
      expect(envelope).to.not.have.property('user')
    })
    it('given content, keeps those properties', () => {
      const envelope = new bot.Envelope({
        strings: ['waves hello'],
        payload: { attachments: [{ fallback: 'I am an attachment' }] },
        method: 'emote'
      })
      expect(envelope).to.deep.include({
        strings: ['waves hello'],
        payload: { attachments: [{ fallback: 'I am an attachment' }] },
        method: 'emote'
      })
    })
  })
  describe('.toRoomId', () => {
    it('sets room id, removes name', () => {
      const envelope = new bot.Envelope({ room: testRoom })
      envelope.toRoomId(testRoomDM.id)
      expect(envelope.room).to.eql({
        id: testRoomDM.id
      })
    })
  })
  describe('.toRoomName', () => {
    it('sets room id, removes name', () => {
      const envelope = new bot.Envelope({ room: testRoom })
      envelope.toRoomName(testRoomDM.name)
      expect(envelope.room).to.eql({
        name: testRoomDM.name
      })
    })
  })
  describe('.toUser', () => {
    it('sets room of user', () => {
      const envelope = new bot.Envelope({ room: testRoom })
      envelope.toUser(testUser)
      expect(envelope.room).to.eql(testUser.room)
    })
  })
  describe('.write', () => {
    it('adds strings to envelope', () => {
      const envelope = new bot.Envelope().write('Test 1', 'Test 2')
      expect(envelope.strings).to.eql(['Test 1', 'Test 2'])
    })
    it('concatenates existing strings with cumulative calls', () => {
      const envelope = new bot.Envelope()
      envelope.write('Test 1', 'Test 2')
      envelope.write('Test 3')
      expect(envelope.strings).to.eql(['Test 1', 'Test 2', 'Test 3'])
    })
  })
  describe('.attach', () => {
    it('adds attachment to envelope payload', () => {
      const envelope = new bot.Envelope().attach({ fallback: 'foo' })
      expect(envelope.payload.toObject()).to.eql({
        attachments: [{ fallback: 'foo' }]
      })
    })
    it('can build payload with cumulative calls', () => {
      const envelope = new bot.Envelope()
      envelope.attach({ fallback: 'bar' })
      envelope.attach({ fallback: 'qux' })
      expect(envelope.payload.toObject()).to.eql({
        attachments: [{ fallback: 'bar' }, { fallback: 'qux' }]
      })
    })
  })
  describe('.compose', () => {
    it('passes strings to write and objects to attach', () => {
      const envelope = new bot.Envelope()
      const write = sinon.spy(envelope, 'write')
      const attach = sinon.spy(envelope, 'attach')
      envelope.compose('hello', { fallback: 'foo' }, 'world')
      expect(write.args).to.eql([['hello'], ['world']])
      expect(attach.args).to.eql([[{ fallback: 'foo' }]])
    })
  })
  describe('.via', () => {
    it('overwrites default method', () => {
      const envelope = new bot.Envelope()
      envelope.via('emote')
      expect(envelope.method).to.equal('emote')
    })
  })
})
