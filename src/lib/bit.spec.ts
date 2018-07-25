import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bit from './bit'
import * as bot from '..'

let message: bot.TextMessage

describe('bit', () => {
  before(() => {
    message = new bot.TextMessage(new bot.User({ id: 'test-user' }), 'foo')
  })
  describe('Bit', () => {
    it('assigns ID if not given', () => {
      const aBit = new bit.Bit({})
      expect(aBit.id).to.match(/bit_\d/)
    })
    it('accepts ID if given', () => {
      const aBit = new bit.Bit({ id: 'TEST_ID' })
      expect(aBit.id).to.equal('TEST_ID')
    })
    describe('.execute', () => {
      it('calls bit callback with state', async () => {
        const callback = sinon.spy()
        const b = new bot.State({ message })
        const aBit = new bit.Bit({ callback })
        await aBit.execute(b)
        sinon.assert.calledWith(callback, b)
      })
    })
  })
  describe('.setupBit', () => {
    it('stores created bit in array', () => {
      const bitId = bit.setupBit({})
      expect(bit.bits[bitId]).to.be.instanceof(bit.Bit)
    })
  })
  describe('.doBit', () => {
    it('executes the bit by ID', async () => {
      const bitId = bit.setupBit({})
      const b = new bot.State({ message })
      const execute = sinon.spy(bit.bits[bitId], 'execute')
      await bit.doBit(bitId, b)
      sinon.assert.calledWith(execute, b)
    })
    it('logs error if bit ID does not exist', async () => {
      const error = sinon.spy(bot.logger, 'error')
      await bit.doBit('404bit', new bot.State({ message }))
      sinon.assert.calledWithMatch(error, /unknown/)
    })
  })
})
