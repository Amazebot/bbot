import 'mocha'
import * as state from './state'
import { expect } from 'chai'
import * as bot from '..'

// Mocks for state population
const listener = new bot.TextListener(/.*/, () => null)
const message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')

describe('state', () => {
  describe('B', () => {
    it('provides access to bot properties', () => {
      const testState = new state.B({ message, listener })
      expect(testState.bot).to.include.all.keys(Object.keys(bot))
    })
    it('accepts extra attributes', () => {
      const testState = new state.B({ message, foo: 'bar' })
      expect(testState.foo).to.equal('bar')
    })
  })
  describe('.finish', () => {
    it('updates done status', () => {
      const testState = new state.B({ message, listener })
      testState.finish()
      expect(testState.done).to.equal(true)
    })
  })
})
