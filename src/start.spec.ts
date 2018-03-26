import { expect } from 'chai'
import { config } from './lib/argv'
config.logLevel = 'silent'

describe('start', () => {
  it('runs async bot startup', () => {
    /** @todo fix and re-enable test using submodule require to start */
    // require('bbot/start').then((bbot) => {
    require('./start').then((bbot) => {
      expect(bbot.bot.started).to.equal(true)
    })
  })
})
