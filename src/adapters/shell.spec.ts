import 'mocha'
import { expect } from 'chai'
import * as bot from '../..'
import * as shell from './shell'

describe('shell', () => {
  describe('.use', () => {
    it('returns adapter instance', () => {
      const store = shell.use(bot)
      expect(store).to.be.instanceof(bot.Adapter)
    })
  })
})
