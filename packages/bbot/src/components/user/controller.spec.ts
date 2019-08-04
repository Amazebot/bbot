import 'mocha'
import { expect } from 'chai'

import { User } from './class'
import { UserController } from './controller'

// mock method dependencies and data
const mockUsers: { [id: string]: User } = {}
const putUser = (user: User) => mockUsers[user.id] = user
const getUser = (id: string) => mockUsers[id]
const getUsers = () => Object.values(mockUsers)

let controller: UserController

describe('[user]', () => {
  describe('UserController', () => {
    beforeEach(() => {
      controller = new UserController({ putUser, getUser, getUsers })
      mockUsers.u1 = new User({ id: 'u1', name: 'user-one' })
      mockUsers.u2 = new User({ id: 'u2', name: 'user-two' })
    })

    describe('.create', () => {
      it('creates a user instance', () => {
        const user = controller.create()
        expect(user).to.be.instanceOf(User)
      })
      it('assigns ID if not given', () => {
        const user = controller.create()
        expect(user.id).to.match(/user_\d/)
      })
      it('assigns ID if given undefined attribute', () => {
        const user = controller.create({ id: undefined })
        expect(user.id).to.match(/user_\d/)
      })
      it('accepts ID if given', () => {
        const user = controller.create({ id: 'TEST_ID' })
        expect(user.id).to.equal('TEST_ID')
      })
      it('uses ID as name if none given', () => {
        const user = controller.create({ id: 'TEST_ID' })
        expect(user.name).to.equal('TEST_ID')
      })
      it('accepts extra meta details', () => {
        const user = controller.create({ id: 'TEST_ID', foo: 'bar' })
        expect(user.foo).to.equal('bar')
      })
    })

    describe('.random', () => {
      it('creates a user instance with random ID', () => {
        const user = controller.random()
        expect(user.id).to.have.lengthOf(32)
      })
    })

    describe('.blank', () => {
      it('creates a user instance with null ID', () => {
        const user = controller.blank()
        expect(user.id).to.equal('null-user')
      })
    })

    describe('.byId', () => {
      it('returns user for ID', () => {
        expect(controller.byId('u1')).to.eql(mockUsers.u1)
      })
      it('stores given user against ID', () => {
        const newUser = new User({ id: 'u3', name: 'user-three' })
        controller.byId('u3', newUser)
        expect(mockUsers.u3).to.eql(newUser)
      })
      it('creates user from plain object', () => {
        const u3 = { id: 'u3', name: 'user-three' }
        const newUser = new User(u3)
        expect(controller.byId('u3', u3))
          .to.eql(newUser).and.be.instanceof(User)
      })
      it('updates existing user', () => {
        const u2Update = new User({ id: 'u2', name: 'newName' })
        controller.byId('u2', u2Update)
        expect(mockUsers.u2).to.eql(u2Update)
      })
      it('updates user by reference', () => {
        const testUser = controller.byId('u1')
        testUser.foo = 'foo'
        const reUser = controller.byId('u1')
        expect(reUser.foo).to.equal('foo')
      })
      it('merges data from sequential lookups', () => {
        const add1 = (u: any) => u.count = (u.count) ? u.count + 1 : 1
        add1(controller.byId('u1', { foo: 'foo' }))
        add1(controller.byId('u1', { bar: 'bar' }))
        expect(controller.byId('u1')).to.include({
          id: 'u1',
          name: 'user-one',
          foo: 'foo',
          bar: 'bar',
          count: 2
        })
      })
    })

    describe('.usersByName', () => {
      beforeEach(() => {
        mockUsers.u1.name = 'test'
        mockUsers.u2.name = 'test'
        mockUsers.u3 = new User({ id: 'u3', name: 'test-3' })
      })
      it('returns array of users sharing a name', () => {
        expect(controller.byName('test')).to.eql([ mockUsers.u1, mockUsers.u2 ])
      })
      it('name matches are case-insensitive', () => {
        expect(controller.byName('TeST-3')).to.eql([ mockUsers.u3 ])
      })
    })
  })
})
