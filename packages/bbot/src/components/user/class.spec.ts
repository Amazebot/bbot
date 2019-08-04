import 'mocha'
import { expect } from 'chai'

import { User } from './class'

describe('[user]', () => {
  describe('User', () => {
    describe('constructor', () => {
      it('assigns meta as properties', () => {
        const testUser = new User({
          id: 'test',
          name: 'test',
          meta: { foo: 'bar' }
        })
        expect(testUser.foo).to.equal('bar')
      })
    })
  })
})
