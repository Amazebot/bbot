import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import { promisify } from 'util'
import * as bot from '..'
const room = bot.room.create({ id: 'testing' })
const user = new bot.User({ id: 'tester', room })
const message = new bot.TextMessage(user, '_')
let clock: sinon.SinonFakeTimers

const Timeout = setTimeout(() => null, 100).constructor // prototype to compare
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const setImmediatePromise = promisify(setImmediate)

describe('[dialogue]', () => {
  describe('constructor', () => {
    it('inherits bot configs', () => {
      bot.settings.set('dialogue-timeout', 999)
      bot.settings.set('dialogue-timeout-text', 'testing')
      bot.settings.set('dialogue-timeout-method', 'test')
      const dialogue = new bot.dialogue.Dialogue()
      expect(dialogue.timeout).to.equal(999)
      expect(dialogue.timeoutText).to.equal('testing')
      expect(dialogue.timeoutMethod).to.equal('test')
      bot.settings.resetConfig()
    })
    it('accepts config from options arg', () => {
      const dialogue = new bot.dialogue.Dialogue({
        timeout: 999,
        timeoutText: 'testing',
        timeoutMethod: 'test',
        audience: 'room'
      })
      expect(dialogue.timeout).to.equal(999)
      expect(dialogue.timeoutText).to.equal('testing')
      expect(dialogue.timeoutMethod).to.equal('test')
      expect(dialogue.audience).to.equal('room')
    })
    it('assigns a default onTimeout method', () => {
      const dialogue = new bot.dialogue.Dialogue()
      expect(typeof dialogue.onTimeout).to.equal('function')
    })
    it('default onTimeout responds to user in state', () => {
      const state = sinon.createStubInstance(bot.State)
      state.respondVia.resolves()
      const dialogue = new bot.dialogue.Dialogue()
      dialogue.onTimeout!(state)
      sinon.assert.calledOnce(state.respondVia)
    })
  })
  describe('.open', () => {
    beforeEach(() => bot.dialogue.reset())
    it('calls .onOpen with state', async () => {
      const dialogue = new bot.dialogue.Dialogue()
      dialogue.onOpen = sinon.spy()
      await dialogue.open(new bot.State({ message }))
      sinon.assert.calledOnce(dialogue.onOpen as sinon.SinonSpy)
    })
    context('`direct` audience', () => {
      it('adds dialogue to engaged under user and room ID', async () => {
        const dialogue = new bot.dialogue.Dialogue({ audience: 'direct' })
        await dialogue.open(new bot.State({ message }))
        expect(bot.dialogue.dialogues).to.have.property(
          `${user.id}_${room.id}`, dialogue
        )
      })
    })
    context('`user` audience', () => {
      it('adds dialogue to engaged under user ID', async () => {
        const dialogue = new bot.dialogue.Dialogue({ audience: 'user' })
        await dialogue.open(new bot.State({ message }))
        expect(bot.dialogue.dialogues).to.have.property(user.id, dialogue)
      })
    })
    context('`room` audience', () => {
      it('adds dialogue to engaged under room ID', async () => {
        const dialogue = new bot.dialogue.Dialogue({ audience: 'room' })
        await dialogue.open(new bot.State({ message }))
        expect(bot.dialogue.dialogues).to.have.property(room.id, dialogue)
      })
    })
  })
  describe('.close', () => {
    it('resolves false if not opened', async () => {
      const dialogue = new bot.dialogue.Dialogue()
      expect(await dialogue.close()).to.equal(false)
    })
    it('calls .onClose ', async () => {
      const dialogue = new bot.dialogue.Dialogue()
      await dialogue.open(new bot.State({ message }))
      dialogue.onClose = sinon.spy()
      await dialogue.close()
      sinon.assert.calledOnce(dialogue.onClose as sinon.SinonSpy)
    })
  })
  describe('.startClock', () => {
    it('throws without state', () => {
      const dialogue = new bot.dialogue.Dialogue()
      expect(() => dialogue.startClock()).to.throw()
    })
    it('returns undefined if timeout == 0', async () => {
      const dialogue = new bot.dialogue.Dialogue({ timeout: 0 })
      await dialogue.open(new bot.State({ message }))
      expect(typeof dialogue.startClock()).to.equal('undefined')
    })
    it('creates and returns timeout if > 0', async () => {
      const dialogue = new bot.dialogue.Dialogue({ timeout: 100 })
      await dialogue.open(new bot.State({ message }))
      const clock = dialogue.startClock()
      expect(dialogue.clock).to.be.instanceOf(Timeout)
      expect(clock).to.be.instanceOf(Timeout)
    })
    context('(with mock timers)', () => {
      beforeEach(() => clock = sinon.useFakeTimers())
      afterEach(() => clock.restore())
      it('calls .onTimeout with state on timeout', async () => {
        const dialogue = new bot.dialogue.Dialogue({ timeout: 100 })
        const state = new bot.State({ message })
        await dialogue.open(state)
        dialogue.onTimeout = sinon.spy()
        dialogue.startClock()
        clock.tick(150)
        expect(sinon.assert.calledWithExactly(
          dialogue.onTimeout as sinon.SinonSpy,
          state)
        )
      })
      it('calls .close after async .onTimeout', async () => {
        const dialogue = new bot.dialogue.Dialogue({ timeout: 100 })
        await dialogue.open(new bot.State({ message }))
        dialogue.onTimeout = () => delay(100)
        dialogue.close = sinon.spy()
        dialogue.startClock()
        clock.tick(150)
        expect(sinon.assert.notCalled(dialogue.close as sinon.SinonSpy))
        clock.tick(100)
        await setImmediatePromise() // wait for start of next event loop
        expect(sinon.assert.calledOnce(dialogue.close as sinon.SinonSpy))
      })
      it('accepts custom timeout', async () => {
        const dialogue = new bot.dialogue.Dialogue({ timeout: 150 })
        await dialogue.open(new bot.State({ message }))
        dialogue.onTimeout = sinon.spy()
        dialogue.startClock(50)
        clock.tick(100)
        expect(sinon.assert.calledOnce(dialogue.onTimeout as sinon.SinonSpy))
      })
      it('stops existing timers', async () => {
        const dialogue = new bot.dialogue.Dialogue()
        await dialogue.open(new bot.State({ message }))
        dialogue.onTimeout = sinon.spy()
        dialogue.startClock(50)
        dialogue.startClock(150)
        clock.tick(100)
        expect(sinon.assert.notCalled(dialogue.onTimeout as sinon.SinonSpy))
        clock.tick(200)
        clock.restore()
        expect(sinon.assert.calledOnce(dialogue.onTimeout as sinon.SinonSpy))
      })
      it('removes timer after timeout', async () => {
        const dialogue = new bot.dialogue.Dialogue()
        await dialogue.open(new bot.State({ message }))
        dialogue.startClock(50)
        clock.tick(100)
        expect(typeof dialogue.clock).to.equal('undefined')
      })
      it('timer can be restarted after timeout', async () => {
        const dialogue = new bot.dialogue.Dialogue()
        await dialogue.open(new bot.State({ message }))
        dialogue.onTimeout = sinon.spy()
        dialogue.startClock(50)
        clock.tick(100)
        dialogue.startClock(50)
        clock.tick(100)
        expect(sinon.assert.calledTwice(dialogue.onTimeout as sinon.SinonSpy))
      })
    })
  })
})
