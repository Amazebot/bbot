import 'mocha'
import { expect } from 'chai'
import { Adapters } from './controllers/adapters'
import bBot from '../bot'

describe('[bot]', () => {
  describe('bBot', () => {
    it.only('instance includes all modules / classes', () => {
      expect(bBot.adapters).to.be.instanceof(Adapters)
    })
  })
})
