import 'mocha'
import { room, memory } from '.'
import { expect } from 'chai'
const mockRooms = {
  'r1': room.create({ id: 'r1', name: 'test-1' }),
  'r2': room.create({ id: 'r2', name: 'test-2' })
}

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
      const testRoom = room.random()
      expect(testRoom.id).to.have.lengthOf(32)
    })
  })
  describe('.blank', () => {
    it('creates a room instance with generic ID', () => {
      const testRoom = room.blank()
      expect(testRoom.id).to.eql('room')
    })
  })
  describe('.byId', () => {
    it('returns user for ID', () => {
      memory.rooms = mockRooms
      expect(room.byId('r1')).to.eql(mockRooms.r1)
    })
    it('stores given user against ID', () => {
      memory.rooms = mockRooms
      const newRoom = new room.Room({ id: 'r3', name: 'test-3' })
      expect(room.byId('u3', newRoom)).to.eql(newRoom)
    })
    it('creates user from plain object', () => {
      const newUser = new room.Room({ id: 'r3', name: 'test-3' })
      expect(room.byId('r3', { id: 'r3', name: 'test-3' }))
        .to.eql(newUser).and.be.instanceof(room.Room)
    })
    it('updates existing user', () => {
      memory.rooms = mockRooms
      const r2Update = new room.Room({ id: 'r2', name: 'newName' })
      expect(room.byId('r2', r2Update)).to.eql(r2Update)
    })
    it('updates user by reference', () => {
      memory.rooms = mockRooms
      const testRoom = room.byId('u1')
      testRoom.foo = 'foo'
      const reUser = room.byId('u1')
      expect(reUser.foo).to.equal('foo')
    })
    it('merges data from sequential lookups', () => {
      const add1 = (r: any) => r.count = (r.count) ? r.count + 1 : 1
      memory.rooms = mockRooms
      add1(room.byId('r1', { foo: 'foo' }))
      add1(room.byId('r1', { bar: 'bar' }))
      expect(room.byId('r1')).to.include({
        id: 'r1',
        name: 'test-1',
        foo: 'foo',
        bar: 'bar',
        count: 2
      })
    })
  })
})
