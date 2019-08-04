import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import { Adapter } from './class'
import { AdapterController } from './controller'
import { ShellAdapter } from '../../adapters/shell'
import * as mocks from '../../test/mock'

import { Bot } from '../../bot'
const sandbox = sinon.createSandbox()
const bot = sandbox.createStubInstance(Bot) as any

describe('[adapter/controller]', () => {
  afterEach(() => sandbox.reset())
  after(() => sandbox.restore())

  describe('.isAdapter', () => {
    it.only('returns true for adapter instances', () => {
      expect(new AdapterController(bot).isAdapter(mocks.mockAdapter))
        .to.equal(true)
    })
    it('returns false if adapter instance not implemented properly', () => {
      expect(new AdapterController(bot).isAdapter({
        name: 'invalid-adapter',
        bot: new Bot(),
        start: Promise.resolve()
        // <-- missing .shutdown()
      }))
        .to.equal(false)
    })
  })

  describe('.fromModule', () => {
    it('returns undefined if no module found', () => {
      const result = new AdapterController(bot).fromModule('not-a-module')
      expect(typeof result)
        .to.equal('undefined')
    })
  })
  describe('.fromPath', () => {
    it('loads adapter exported at path', () => {
      const test = new AdapterController(bot).fromPath('./test/mock')
      expect(test.use(bot))
        .to.be.an.instanceof(Adapter)
    })
    it('loads internal adapters at path', () => {
      const test = new AdapterController(bot).fromPath('./adapters/shell')
      expect(test.use(bot))
        .to.be.an.instanceof(ShellAdapter)
    })
  })

  describe('.load', () => {
    beforeEach(() => {
      sandbox.stub(AdapterController.prototype, 'fromModule')
        .withArgs('good-name').returns({ use: mocks.use })
        .withArgs('bad-name').returns(undefined)
      sandbox.stub(AdapterController.prototype, 'fromPath')
        .returns({ use: mocks.use })
    })
    it('loads from module if not given a path', () => {
      const controller = new AdapterController(bot)
      controller.load('good-name')
      sandbox.assert.calledOnce(controller.fromModule as any)
    })
    it('does not attempt load from module if path given', () => {
      const controller = new AdapterController(bot)
      controller.load('./path')
      sandbox.assert.notCalled(controller.fromModule as any)
    })
    it('attempts to load from path if path given', () => {
      const controller = new AdapterController(bot)
      controller.load('./path')
      sandbox.assert.calledOnce(controller.fromPath as any)
    })
    it('attempts to use name as path if module loading fails', () => {
      const controller = new AdapterController(bot)
      controller.load('bad-name')
      sandbox.assert.calledWithMatch(controller.fromPath as any, /\/bad-name/)
    })
  })

  describe('.loadAll', () => {
    context('with no adapters in config', () => {
      it('loads nothing', () => {
        expect(() => new AdapterController(bot).loadAll())
          .to.not.throw()
      })
    })
    context('with invalid path in config', () => {
      before(() => bot.config = {
        // all gets fail
        get: () => 'not-a-valid-path'
      } as any)
      it('throws', () => {
        expect(() => new AdapterController(bot).loadAll())
          .to.throw()
      })
    })
    context('with default config', () => {
      before(() => bot.config = {
        // all gets except message-adapter undefined
        get: (x: string) => (x === 'message-adapter') ? 'shell' : undefined
      } as any)
      it('loads shell message adapter by default', () => {
        new AdapterController(bot).loadAll()
        expect(new AdapterController(bot).slots)
          .to.have.property('message.name', 'shell-message-adapter')
      })
    })
    context('with valid paths in config', () => {
      before(() => bot.config = {
        // all gets return stub adapter
        get: () => './test/mock'
      } as any)
      it('loads all configured adapters at valid path', () => {
        new AdapterController(bot).loadAll()
        sandbox.assert.calledThrice(mocks.use)
      })
      it('keeps loaded adapters in slots', () => {
        const controller = new AdapterController(bot)
        controller.loadAll()
        expect(controller.slots.message).to.be.instanceof(Adapter)
      })
    })
  })

  describe('.startAll', () => {
    // all gets return stub adapter
    before(() => bot.config = { get: () => './test/mock' } as any)

    it('starts all loaded adapters', async () => {
      const controller = new AdapterController(bot)
      await controller.startAll()
      sinon.assert.calledOnce(controller.slots.storage!.start as sinon.SinonStub)
      sinon.assert.calledOnce(controller.slots.nlu!.start as sinon.SinonStub)
    })
  })

  describe('.shutdownAll', () => {
    it('shuts down all loaded adapters', async () => {
      const controller = new AdapterController(bot)
      await controller.shutdownAll()
      sinon.assert.calledOnce(controller.slots.message!.shutdown as sinon.SinonStub)
      sinon.assert.calledOnce(controller.slots.storage!.shutdown as sinon.SinonStub)
      sinon.assert.calledOnce(controller.slots.nlu!.shutdown as sinon.SinonStub)
    })
  })

  describe('.unloadAll', () => {
    it('clears all configured adapters', async () => {
      const controller = new AdapterController(bot)
      controller.unloadAll()
      expect(controller.slots).to.eql({})
    })
  })

  describe('.names', () => {
    it('outputs the names of current adapters', () => {
      /* @todo */
    })
  })
})
