import 'mocha'
import { expect } from 'chai'

import { rooms, Room } from './controller'
import { memory } from './memory'

const mockRooms = {
  'r1': rooms.create({ id: 'r1', name: 'test-1' }),
  'r2': rooms.create({ id: 'r2', name: 'test-2' })
}

describe('[room]', () => {
  describe('Room', () => {
    describe('constructor', () => {
      it('assigns ID if not given', () => {
        const testRoom = new Room()
        expect(testRoom.id).to.match(/room_\d/)
      })
      it('assigns ID if given undefined attribute', () => {
        const testRoom = new Room({ id: undefined })
        expect(testRoom.id).to.match(/room_\d/)
      })
      it('accepts ID if given', () => {
        const testRoom = new Room({ id: 'TEST_ID' })
        expect(testRoom.id).to.equal('TEST_ID')
      })
      it('uses ID as name if none given', () => {
        const testRoom = new Room({ id: 'TEST_ID' })
        expect(testRoom.name).to.equal('TEST_ID')
      })
      it('accepts extra meta details', () => {
        const testRoom = new Room({ id: 'TEST_ID', foo: 'bar' })
        expect(testRoom.foo).to.equal('bar')
      })
    })
  })
  describe('RoomController', () => {
    describe('.create', () => {
      it('creates a room instance', () => {
        const testRoomA = new Room({ id: 'TEST_ID' })
        const testRoomB = rooms.create({ id: 'TEST_ID' })
        expect(testRoomA).to.eql(testRoomB)
      })
    })
    describe('.random', () => {
      it('creates a room instance with random ID', () => {
        const testRoom = rooms.random()
        expect(testRoom.id).to.have.lengthOf(32)
      })
    })
    describe('.blank', () => {
      it('creates a room instance with generic ID', () => {
        const testRoom = rooms.blank()
        expect(testRoom.id).to.eql('room')
      })
    })
    describe('.byId', () => {
      it('returns user for ID', () => {
        memory.rooms = mockRooms
        expect(rooms.byId('r1')).to.eql(mockRooms.r1)
      })
      it('stores given user against ID', () => {
        memory.rooms = mockRooms
        const newRoom = new Room({ id: 'r3', name: 'test-3' })
        expect(rooms.byId('u3', newRoom)).to.eql(newRoom)
      })
      it('creates user from plain object', () => {
        const newUser = new Room({ id: 'r3', name: 'test-3' })
        expect(rooms.byId('r3', { id: 'r3', name: 'test-3' }))
          .to.eql(newUser).and.be.instanceof(Room)
      })
      it('updates existing user', () => {
        memory.rooms = mockRooms
        const r2Update = new Room({ id: 'r2', name: 'newName' })
        expect(rooms.byId('r2', r2Update)).to.eql(r2Update)
      })
      it('updates user by reference', () => {
        memory.rooms = mockRooms
        const testRoom = rooms.byId('u1')
        testRoom.foo = 'foo'
        const reUser = rooms.byId('u1')
        expect(reUser.foo).to.equal('foo')
      })
      it('merges data from sequential lookups', () => {
        const add1 = (r: any) => r.count = (r.count) ? r.count + 1 : 1
        memory.rooms = mockRooms
        add1(rooms.byId('r1', { foo: 'foo' }))
        add1(rooms.byId('r1', { bar: 'bar' }))
        expect(rooms.byId('r1')).to.include({
          id: 'r1',
          name: 'test-1',
          foo: 'foo',
          bar: 'bar',
          count: 2
        })
      })
    })
  })
})
