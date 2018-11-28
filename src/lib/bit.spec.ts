import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

let message: bot.message.Text

describe('[bit]', () => {
  before(() => {
    message = bot.message.text(bot.user.create({ id: 'test-user' }), 'foo')
  })
  describe('Bit', () => {
    it('assigns ID if not given', () => {
      const aBit = bot.bit.create({})
      expect(aBit.id).to.match(/bit_\d/)
    })
    it('accepts ID if given', () => {
      const aBit = bot.bit.create({ id: 'TEST_ID' })
      expect(aBit.id).to.equal('TEST_ID')
    })
    describe('.execute', () => {
      it('calls bit callback with state', async () => {
        const callback = sinon.spy()
        const b = bot.state.create({ message })
        const aBit = bot.bit.create({ callback })
        await aBit.execute(b)
        sinon.assert.calledWith(callback, b)
      })
    })
  })
  describe('.setupBit', () => {
    it('stores created bit in array', () => {
      const bitId = bot.bit.setup({})
      expect(bot.bit.bits[bitId]).to.be.instanceof(bot.bit.Bit)
    })
  })
  describe('.run', () => {
    it('executes the bit by ID', async () => {
      const bitId = bot.bit.setup({})
      const b = bot.state.create({ message })
      const execute = sinon.spy(bot.bit.bits[bitId], 'execute')
      await bot.bit.run(bitId, b)
      sinon.assert.calledWith(execute, b)
    })
    it('logs error if bit ID does not exist', async () => {
      const error = sinon.spy(bot.logger, 'error')
      await bot.bit.run('404bit', bot.state.create({ message }))
      sinon.assert.calledWithMatch(error, /unknown/)
    })
  })
})
