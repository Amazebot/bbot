import 'mocha'
import * as user from './user'
import { expect } from 'chai'

describe('[user]', () => {
  describe('User', () => {
    describe('constructor', () => {
      it('assigns ID if not given', () => {
        const testUser = new user.User()
        expect(testUser.id).to.have.lengthOf(32)
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
  })
})
