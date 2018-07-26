import 'mocha'
import { expect } from 'chai'
import * as bBot from '../src'

describe('start', () => {
  it('runs async bot startup', () => {
    require('bbot/dist/start').then((bot: typeof bBot) => {
      expect(bot.getStatus()).to.equal('started')
    })
  })
})
