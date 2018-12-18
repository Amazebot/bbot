import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { State } from './state'
import { Bit } from './bit'

describe('[bit]', () => {
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
})
