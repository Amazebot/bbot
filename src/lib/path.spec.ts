import 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '..'

const user = new bot.User({ id: 'TEST_ID', name: 'testy' })
const middleware = new bot.Middleware('mock')
let clock: sinon.SinonFakeTimers

describe('[path]', () => {
  describe('Path', () => {
    describe('.text', () => {
      it('adds text branch to listen collection, returning ID', () => {
        const path = new bot.Path()
        const id = path.text(/test/, () => null)
        expect(path.listen[id]).to.be.instanceof(bot.TextBranch)
      })
    })
    describe('.direct', () => {
      it('adds direct text branch to listen collection, returning ID', () => {
        const path = new bot.Path()
        const id = path.direct(/test/, () => null)
        expect(path.listen[id]).to.be.instanceof(bot.TextBranch)
      })
    })
    describe('.custom', () => {
      it('adds custom branch to listen collection, returning ID', () => {
        const path = new bot.Path()
        const id = path.custom(() => null, () => null)
        expect(path.listen[id]).to.be.instanceof(bot.CustomBranch)
      })
    })
    describe('.NLU', () => {
      it('adds NLU branch to NLU collection, returning ID', () => {
        const path = new bot.Path()
        const id = path.NLU({ intent: { id: 'test' } }, () => null)
        expect(path.understand[id]).to.be.instanceof(bot.NaturalLanguageBranch)
      })
    })
    describe('.directNLU', () => {
      it('adds NLU direct branch to NLU collection, returning ID', () => {
        const path = new bot.Path()
        const id = path.directNLU({ intent: { id: 'test' } }, () => null)
        expect(path.understand[id]).to.be.instanceof(bot.NaturalLanguageDirectBranch)
      })
    })
    describe('.customNLU', () => {
      it('adds custom branch to NLU collection, returning ID', () => {
        const path = new bot.Path()
        const id = path.customNLU(() => null, () => null)
        expect(path.understand[id]).to.be.instanceof(bot.CustomBranch)
      })
      it('.process calls callback on matching message', async () => {
        const path = new bot.Path()
        const callback = sinon.spy()
        const message = new bot.TextMessage(user, 'testing custom NLU')
        const id = path.customNLU(() => true, callback, { id: 'test-custom-nlu' })
        await path.understand[id].process(new bot.State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.enter', () => {
      it('.process calls callback on enter messages', async () => {
        const path = new bot.Path()
        const callback = sinon.spy()
        const message = new bot.EnterMessage(user)
        const id = path.enter(callback)
        await path.listen[id].process(new bot.State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.leave', () => {
      it('.process calls callback on leave messages', async () => {
        const path = new bot.Path()
        const callback = sinon.spy()
        const message = new bot.LeaveMessage(user)
        const id = path.leave(callback)
        await path.listen[id].process(new bot.State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.topic', () => {
      it('.process calls callback on topic messages', async () => {
        const path = new bot.Path()
        const callback = sinon.spy()
        const message = new bot.TopicMessage(user)
        const id = path.topic(callback)
        await path.listen[id].process(new bot.State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.catchAll', () => {
      it('.process calls callback on catchAll messages', async () => {
        const path = new bot.Path()
        const callback = sinon.spy()
        const message = new bot.CatchAllMessage(new bot.TextMessage(user, ''))
        const id = path.catchAll(callback)
        await path.act[id].process(new bot.State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.server', () => {
      it('.process calls callback on matching server message', async () => {
        const path = new bot.Path()
        const callback = sinon.spy()
        const message = new bot.ServerMessage({ userId: user.id, data: {
          foo: 'bar'
        } })
        const id = path.server({ foo: 'bar' }, callback)
        await path.serve[id].process(new bot.State({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.reset', () => {
      it('clears all branches from collections', () => {
        const path = new bot.Path()
        path.text(/.*/, () => null)
        path.NLU({}, () => null)
        path.catchAll(() => null)
        path.reset()
        expect(path.listen).to.eql({})
        expect(path.understand).to.eql({})
        expect(path.act).to.eql({})
      })
    })
    describe('.forced', () => {
      it('clears all but the forced branches from given collection', () => {
        const path = new bot.Path()
        path.text(/.*/, () => null, { id: 'A' })
        path.text(/.*/, () => null, { id: 'B' })
        path.text(/.*/, () => null, { id: 'C', force: true })
        const len = path.forced('listen')
        expect(len).to.equal(1)
        expect(Object.keys(path.listen)).to.eql(['C'])
      })
    })
    describe('.timeout', () => {
      beforeEach(() => clock = sinon.useFakeTimers())
      afterEach(() => clock.restore())
      it('fires callback with state after interval', () => {
        const path = new bot.Path()
        const message = new bot.TextMessage(user, 'testing timeout')
        const state = new bot.State({ message })
        const spy = sinon.spy()
        path.timeout(state, spy, 100)
        clock.tick(200)
        expect(sinon.assert.calledWithExactly(spy, state))
      })
      it('does not fire callback if branch is processed', async () => {
        const path = new bot.Path()
        const message = new bot.TextMessage(user, 'testing timeout')
        const state = new bot.State({ message })
        const spy = sinon.spy()
        const id = path.timeout(state, spy, 100)
        await path.listen[id].process(state, middleware)
        clock.tick(200)
        expect(sinon.assert.notCalled(spy))
      })
      it('responds with defaults if not given action or interval', () => {
        bot.settings.set('path-timeout', 100)
        bot.settings.set('path-timeout-text', 'foo')
        const path = new bot.Path()
        const message = new bot.TextMessage(user, 'testing timeout')
        const state = new bot.State({ message })
        const spy = sinon.spy()
        state.respond = spy
        path.timeout(state)
        clock.tick(200)
        expect(sinon.assert.calledWithExactly(spy, 'foo'))
      })
      it('does not call timeout if default interval is 0', () => {
        bot.settings.set('path-timeout', 0)
        const path = new bot.Path()
        const message = new bot.TextMessage(user, 'testing timeout')
        const state = new bot.State({ message })
        const spy = sinon.spy()
        state.respond = spy
        path.timeout(state)
        clock.tick(200)
        expect(sinon.assert.notCalled(spy))
      })
    })
  })
  describe('.directPattern', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = bot.directPattern()
      expect(direct.toString()).to.include(bot.settings.name)
    })
    it('matches when bot name is prefixed', async () => {
      const direct = bot.directPattern()
      expect(direct.test(`${bot.settings.name} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed', async () => {
      const direct = bot.directPattern()
      expect(direct.test(`${bot.settings.alias} test`)).to.equal(true)
    })
    it('matches when bot alias is prefixed with @ symbol', async () => {
      const direct = bot.directPattern()
      expect(direct.test(`@${bot.settings.name} test`)).to.equal(true)
    })
    it('does not match unless bot name is prefixed', async () => {
      const direct = bot.directPattern()
      expect(direct.test(`test`)).to.equal(false)
    })
  })
  describe('.directPatterCombined', () => {
    it('creates new regex for bot name prefixed to original', () => {
      const direct = bot.directPatternCombined(/test/)
      expect(direct.toString()).to.include(bot.settings.name).and.include('test')
    })
    it('does not match on name unless otherwise matched', () => {
      const direct = bot.directPatternCombined(/test/)
      expect(direct.test(`${bot.settings.name}`)).to.equal(false)
    })
  })
})
