import 'mocha'
import { User } from '..'
import { expect } from 'chai'

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
  })
})
