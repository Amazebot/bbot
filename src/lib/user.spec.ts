import 'mocha'
import { user, memory } from '.'
import { expect } from 'chai'
const mockUsers = {
  'u1': user.create({ id: 'u1', name: 'test-1' }),
  'u2': user.create({ id: 'u2', name: 'test-2' })
}

describe('[user]', () => {
  describe('User', () => {
    describe('constructor', () => {
      it('assigns ID if not given', () => {
        const testUser = new user.User()
        expect(testUser.id).to.match(/user_\d/)
      })
      it('assigns ID if given undefined attribute', () => {
        const testUser = new user.User({ id: undefined })
        expect(testUser.id).to.match(/user_\d/)
      })
      it('accepts ID if given', () => {
        const testUser = new user.User({ id: 'TEST_ID' })
        expect(testUser.id).to.equal('TEST_ID')
      })
      it('uses ID as name if none given', () => {
        const testUser = new user.User({ id: 'TEST_ID' })
        expect(testUser.name).to.equal('TEST_ID')
      })
      it('accepts extra meta details', () => {
        const testUser = new user.User({ id: 'TEST_ID', foo: 'bar' })
        expect(testUser.foo).to.equal('bar')
      })
    })
    describe('.create', () => {
      it('creates a user instance', () => {
        const userA = new user.User({ id: 'TEST_ID' })
        const userB = user.create({ id: 'TEST_ID' })
        expect(userA).to.eql(userB)
      })
      it('consecutive users can be in same room', () => {
        const userA = user.create({ id: 'USER_A', room: { id: 'ROOM_A' } })
        const userB = user.create({ id: 'USER_B', room: { id: 'ROOM_A' } })
        expect(userA.room).to.eql(userB.room)
      })
    })
    describe('.random', () => {
      it('creates a user instance with random ID', () => {
        const userA = user.random()
        expect(userA.id).to.have.lengthOf(32)
      })
    })
    describe('.byId', () => {
      it('returns user for ID', () => {
        memory.users = mockUsers
        expect(user.byId('u1')).to.eql(mockUsers.u1)
      })
      it('stores given user against ID', () => {
        memory.users = mockUsers
        const newUser = new user.User({ id: 'u3', name: 'test-3' })
        expect(user.byId('u3', newUser))
          .to.eql(newUser)
      })
      it('creates user from plain object', () => {
        const newUser = new user.User({ id: 'u3', name: 'test-3' })
        expect(user.byId('u3', { id: 'u3', name: 'test-3' }))
          .to.eql(newUser).and.be.instanceof(user.User)
      })
      it('updates existing user', () => {
        memory.users = mockUsers
        const u2Update = new user.User({ id: 'u2', name: 'newName' })
        expect(user.byId('u2', u2Update)).to.eql(u2Update)
      })
      it('updates user by reference', () => {
        memory.users = mockUsers
        const testUser = user.byId('u1')
        testUser.foo = 'foo'
        const reUser = user.byId('u1')
        expect(reUser.foo).to.equal('foo')
      })
      it('merges data from sequential lookups', () => {
        const add1 = (u: any) => u.count = (u.count) ? u.count + 1 : 1
        memory.users = mockUsers
        add1(user.byId('u1', { foo: 'foo' }))
        add1(user.byId('u1', { bar: 'bar' }))
        expect(user.byId('u1')).to.include({
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
        memory.users.u3 = new user.User({ id: 'u3', name: 'test-3' })
      })
      it('returns array of users sharing a name', () => {
        expect(user.byName('test')).to.eql([
          memory.users.u1,
          memory.users.u2
        ])
      })
      it('name matches are case-insensitive', () => {
        expect(user.byName('TeST-3')).to.eql([
          memory.users.u3
        ])
      })
    })
  })
})
