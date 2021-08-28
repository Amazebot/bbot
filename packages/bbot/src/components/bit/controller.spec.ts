import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import { State } from '../state/class'
import { Bit } from './class'
import { BitController } from './controller'
import { logger } from '../../util'

describe('[bit]', () => {
  describe('BitController', () => {
    describe('.create', () => {
      it('stores created bit in array', () => {
        const controller = new BitController()
        const bitId = controller.create({})
        expect(controller.bits[bitId]).to.be.instanceof(Bit)
      })
    })
    describe('.run', () => {
      it('executes the bit by ID', async () => {
        const controller = new BitController()
        const bitId = controller.create({})
        const b = sinon.createStubInstance(State)
        const execute = sinon.spy(controller.bits[bitId], 'run')
        await controller.run(bitId, b)
        sinon.assert.calledWith(execute, b)
      })
      it('logs error if bit ID does not exist', async () => {
        const controller = new BitController()
        const error = sinon.spy(logger, 'error')
        await controller.run('404bit', new State())
        sinon.assert.calledWithMatch(error, /unknown/)
        error.restore()
      })
    })
  })
})
