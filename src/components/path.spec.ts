import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import * as bot from '.'

const user = bot.user.create({ id: 'TEST_ID', name: 'testy' })
const middleware = new bot.middleware.Middleware('mock')

describe('[path]', () => {
  describe('Path', () => {
    describe('.text', () => {
      it('adds text branch to listen collection, returning ID', () => {
        const path = bot.path.create()
        const id = path.text(/test/, () => null)
        expect(path.listen[id]).to.be.instanceof(bot.branch.Text)
      })
    })
    describe('.direct', () => {
      it('adds direct text branch to listen collection, returning ID', () => {
        const path = bot.path.create()
        const id = path.direct(/test/, () => null)
        expect(path.listen[id]).to.be.instanceof(bot.branch.Text)
      })
    })
    describe('.custom', () => {
      it('adds custom branch to listen collection, returning ID', () => {
        const path = bot.path.create()
        const id = path.custom(() => null, () => null)
        expect(path.listen[id]).to.be.instanceof(bot.branch.Custom)
      })
    })
    describe('.NLU', () => {
      it('adds NLU branch to NLU collection, returning ID', () => {
        const path = bot.path.create()
        const id = path.NLU({ intent: { id: 'test' } }, () => null)
        expect(path.understand[id]).to.be.instanceof(bot.branch.NLU)
      })
    })
    describe('.directNLU', () => {
      it('adds NLU direct branch to NLU collection, returning ID', () => {
        const path = bot.path.create()
        const id = path.directNLU({ intent: { id: 'test' } }, () => null)
        expect(path.understand[id]).to.be.instanceof(bot.branch.NLUDirect)
      })
    })
    describe('.customNLU', () => {
      it('adds custom branch to NLU collection, returning ID', () => {
        const path = bot.path.create()
        const id = path.customNLU(() => null, () => null)
        expect(path.understand[id]).to.be.instanceof(bot.branch.Custom)
      })
      it('.process calls callback on matching message', async () => {
        const path = bot.path.create()
        const callback = sinon.spy()
        const message = bot.message.text(user, 'testing custom NLU')
        const id = path.customNLU(() => true, callback, { id: 'test-custom-nlu' })
        await path.understand[id].process(bot.state.create({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.enter', () => {
      it('.process calls callback on enter messages', async () => {
        const path = bot.path.create()
        const callback = sinon.spy()
        const message = bot.message.enter(user)
        const id = path.enter(callback)
        await path.listen[id].process(bot.state.create({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.leave', () => {
      it('.process calls callback on leave messages', async () => {
        const path = bot.path.create()
        const callback = sinon.spy()
        const message = bot.message.leave(user)
        const id = path.leave(callback)
        await path.listen[id].process(bot.state.create({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.topic', () => {
      it('.process calls callback on topic messages', async () => {
        const path = bot.path.create()
        const callback = sinon.spy()
        const message = bot.message.topic(user)
        const id = path.topic(callback)
        await path.listen[id].process(bot.state.create({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.catchAll', () => {
      it('.process calls callback on catchAll messages', async () => {
        const path = bot.path.create()
        const callback = sinon.spy()
        const message = bot.message.catchAll(bot.message.text(user, ''))
        const id = path.catchAll(callback)
        await path.act[id].process(bot.state.create({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.server', () => {
      it('.process calls callback on matching server message', async () => {
        const path = bot.path.create()
        const callback = sinon.spy()
        const message = bot.message.server({ userId: user.id, data: {
          foo: 'bar'
        } })
        const id = path.server({ foo: 'bar' }, callback)
        await path.serve[id].process(bot.state.create({ message }), middleware)
        sinon.assert.calledOnce(callback)
      })
    })
    describe('.reset', () => {
      it('clears all branches from collections', () => {
        const path = bot.path.create()
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
        const path = bot.path.create()
        path.text(/.*/, () => null, { id: 'A' })
        path.text(/.*/, () => null, { id: 'B' })
        path.text(/.*/, () => null, { id: 'C', force: true })
        const len = path.forced('listen')
        expect(len).to.equal(1)
        expect(Object.keys(path.listen)).to.eql(['C'])
      })
    })
  })
})
