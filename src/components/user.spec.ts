import 'mocha'

import { users, User } from './user'
import { memory } from './memory'

import { expect } from 'chai'
const mockUsers = {
  'u1': users.create({ id: 'u1', name: 'test-1' }),
  'u2': users.create({ id: 'u2', name: 'test-2' })
}

describe('[user]', () => {
  describe('User', () => {
    describe('constructor', () => {
      it('assigns ID if not given', () => {
        const testUser = new User()
        expect(testUser.id).to.match(/user_\d/)
      })
      it('assigns ID if given undefined attribute', () => {
        const testUser = new User({ id: undefined })
        expect(testUser.id).to.match(/user_\d/)
      })
      it('accepts ID if given', () => {
        const testUser = new User({ id: 'TEST_ID' })
        expect(testUser.id).to.equal('TEST_ID')
      })
      it('uses ID as name if none given', () => {
        const testUser = new User({ id: 'TEST_ID' })
        expect(testUser.name).to.equal('TEST_ID')
      })
      it('accepts extra meta details', () => {
        const testUser = new User({ id: 'TEST_ID', foo: 'bar' })
        expect(testUser.foo).to.equal('bar')
      })
    })
    describe('.create', () => {
      it('creates a user instance', () => {
        const userA = new User({ id: 'TEST_ID' })
        const userB = users.create({ id: 'TEST_ID' })
        expect(userA).to.eql(userB)
      })
      it('consecutive users can be in same room', () => {
        const userA = users.create({ id: 'USER_A', room: { id: 'ROOM_A' } })
        const userB = users.create({ id: 'USER_B', room: { id: 'ROOM_A' } })
        expect(userA.room).to.eql(userB.room)
      })
    })
    describe('.random', () => {
      it('creates a user instance with random ID', () => {
        const userA = users.random()
        expect(userA.id).to.have.lengthOf(32)
      })
    })
    describe('.byId', () => {
      it('returns user for ID', () => {
        memory.users = mockUsers
        expect(users.byId('u1')).to.eql(mockUsers.u1)
      })
      it('stores given user against ID', () => {
        memory.users = mockUsers
        const newUser = new User({ id: 'u3', name: 'test-3' })
        expect(users.byId('u3', newUser))
          .to.eql(newUser)
      })
      it('creates user from plain object', () => {
        const newUser = new User({ id: 'u3', name: 'test-3' })
        expect(users.byId('u3', { id: 'u3', name: 'test-3' }))
          .to.eql(newUser).and.be.instanceof(User)
      })
      it('updates existing user', () => {
        memory.users = mockUsers
        const u2Update = new User({ id: 'u2', name: 'newName' })
        expect(users.byId('u2', u2Update)).to.eql(u2Update)
      })
      it('updates user by reference', () => {
        memory.users = mockUsers
        const testUser = users.byId('u1')
        testUser.foo = 'foo'
        const reUser = users.byId('u1')
        expect(reUser.foo).to.equal('foo')
      })
      it('merges data from sequential lookups', () => {
        const add1 = (u: any) => u.count = (u.count) ? u.count + 1 : 1
        memory.users = mockUsers
        add1(users.byId('u1', { foo: 'foo' }))
        add1(users.byId('u1', { bar: 'bar' }))
        expect(users.byId('u1')).to.include({
          id: 'u1',
          name: 'test-1',
          foo: 'foo',
          bar: 'bar',
          count: 2
        })
      })
    })
    describe('.usersByName', () => {
      beforeEach(() => {
        memory.users = mockUsers
        memory.users.u1.name = 'test'
        memory.users.u2.name = 'test'
        memory.users.u3 = new User({ id: 'u3', name: 'test-3' })
      })
      it('returns array of users sharing a name', () => {
        expect(users.byName('test')).to.eql([
          memory.users.u1,
          memory.users.u2
        ])
      })
      it('name matches are case-insensitive', () => {
        expect(users.byName('TeST-3')).to.eql([
          memory.users.u3
        ])
      })
    })
  })
})
