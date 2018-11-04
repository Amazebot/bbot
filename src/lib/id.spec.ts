import 'mocha'
import { expect } from 'chai'
import * as bot from '..'

describe('[id]', () => {
  describe('random', () => {
    it('creates 32 char hash', () => {
      expect(bot.id.random()).to.be.a('string').and.to.have.lengthOf(32)
    })
  })
  describe('.counter', () => {
    it('returns a uid with a number', () => {
      expect(bot.id.counter()).to.match(/uid_\d/)
    })
    it('returns a uid with given prefix', () => {
      expect(bot.id.counter('prefix')).to.match(/prefix_\d/)
    })
    it('returns sequential IDs', () => {
      const id1 = bot.id.counter('prefix')
      const id2 = bot.id.counter('prefix')
      const id1Num = parseInt(id1.match(/prefix_(\d)/)![1], 10)
      const id2Num = parseInt(id2.match(/prefix_(\d)/)![1], 10)
      expect(id2Num).to.equal(id1Num + 1)
    })
  })
})
