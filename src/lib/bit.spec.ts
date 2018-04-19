import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import { State } from './state'
import { logger } from './logger'
import * as bit from './bit'

describe('bit', () => {
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
        const state = new State()
        const aBit = new bit.Bit({ callback })
        await aBit.execute(state)
        sinon.assert.calledWith(callback, state)
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
      const state = new State()
      const execute = sinon.spy(bit.bits[bitId], 'execute')
      await bit.doBit(bitId, state)
      sinon.assert.calledWith(execute, state)
    })
    it('logs error if bit ID does not exist', async () => {
      const error = sinon.spy(logger, 'error')
      await bit.doBit('404bit', new State())
      sinon.assert.calledWithMatch(error, /unknown/)
    })
  })
})
