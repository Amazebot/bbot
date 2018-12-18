import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import logger from './logger'
import bits from './bits'
import { Bit } from '../components/bit'
import { State } from '../components/state'

describe('[bits]', () => {
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
