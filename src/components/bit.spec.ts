import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import { State } from './state'
import bits, { Bit } from './bit'
import logger from '../util/logger'

describe.only('[bit]', () => {
  describe('Bit', () => {
    it('assigns ID if not given', () => {
      const aBit = new Bit({})
      expect(aBit.id).to.match(/bit_\d/)
    })
    it('accepts ID if given', () => {
      const aBit = new Bit({ id: 'TEST_ID' })
      expect(aBit.id).to.equal('TEST_ID')
    })
    describe('.run', () => {
      it('calls bit callback with state', async () => {
        const callback = sinon.spy()
        const b = new State()
        const aBit = new Bit({ callback })
        await aBit.run(b)
        sinon.assert.calledWith(callback, b)
      })
    })
  })
  describe('BitController', () => {
    describe('.setup', () => {
      it('stores created bit in array', () => {
        const bitId = bits.setup({})
        expect(bits.current[bitId]).to.be.instanceof(Bit)
      })
    })
    describe('.run', () => {
      it('executes the bit by ID', async () => {
        const bitId = bits.setup({})
        const b = new State()
        const execute = sinon.spy(bits.current[bitId], 'run')
        await bits.run(bitId, b)
        sinon.assert.calledWith(execute, b)
      })
      it('logs error if bit ID does not exist', async () => {
        const error = sinon.spy(logger, 'error')
        await bits.run('404bit', new State())
        sinon.assert.calledWithMatch(error, /unknown/)
        error.restore()
      })
    })
  })
})
