import { expect } from 'chai'
import { config } from './lib/argv'

describe('start', () => {
  it('runs async bot startup', () => {
    /** @todo fix and re-enable test using submodule require to start */
    // require('bbot/start').then((bbot) => {
    return require('./start').then((bbot) => {
      expect(bbot.getState()).to.equal('ready')
    })
  })
})
