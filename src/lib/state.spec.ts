import 'mocha'
import * as state from './state'
import { expect } from 'chai'

describe('state', () => {
  describe('State', () => {
    it('provides access to bot properties', () => {
      const testState = new state.State()
      expect(testState.bot).to.include.all.keys([
        'events',
        'config',
        'logger',
        'middlewares',
        'adapters',
        'start'
      ])
    })
    it('accepts extra attributes', () => {
      const testState = new state.State({ foo: 'bar' })
      expect(testState.foo).to.equal('bar')
    })
  })
})
