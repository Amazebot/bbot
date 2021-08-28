import 'mocha'
import * as sinon from 'sinon'

import { State } from '../state/class'
import { Bit } from './class'

describe('[bit]', () => {
  describe('Bit', () => {
    describe('.run', () => {
      it('calls bit callback with state', async () => {
        const callback = sinon.spy()
        const b = new State()
        const aBit = new Bit('TEST_ID', { callback })
        await aBit.run(b)
        sinon.assert.calledWith(callback, b)
      })
    })
  })
})
