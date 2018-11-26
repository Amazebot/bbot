import 'mocha'
import { room } from '..'
import { expect } from 'chai'
import { isatty } from 'tty';

describe('[room]', () => {
  describe('Room', () => {
    describe('constructor', () => {
      it('assigns ID if not given', () => {
        const testRoom = new room.Room()
        expect(testRoom.id).to.match(/room_\d/)
      })
      it('assigns ID if given undefined attribute', () => {
        const testRoom = new room.Room({ id: undefined })
        expect(testRoom.id).to.match(/room_\d/)
      })
      it('accepts ID if given', () => {
        const testRoom = new room.Room({ id: 'TEST_ID' })
        expect(testRoom.id).to.equal('TEST_ID')
      })
      it('uses ID as name if none given', () => {
        const testRoom = new room.Room({ id: 'TEST_ID' })
        expect(testRoom.name).to.equal('TEST_ID')
      })
      it('accepts extra meta details', () => {
        const testRoom = new room.Room({ id: 'TEST_ID', foo: 'bar' })
        expect(testRoom.foo).to.equal('bar')
      })
    })
  })
  describe('.create', () => {
    it('creates a room instance', () => {
      const testRoomA = new room.Room({ id: 'TEST_ID' })
      const testRoomB = room.create({ id: 'TEST_ID' })
      expect(testRoomA).to.eql(testRoomB)
    })
  })
  describe('.random', () => {
    it('creates a room instance with random ID', () => {
      const testRoomA = new room.Room({ id: 'TEST_ID' })
      const testRoomB = room.create({ id: 'TEST_ID' })
      expect(testRoomA).to.eql(testRoomB)
    })
  })
})
