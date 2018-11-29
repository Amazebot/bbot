import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import axios from 'axios'
import * as bot from '.'

// namespaced functions can't be stubbed normally
const serve = sinon.stub().resolves(true)
const serveRestore = bot.thought.serve
bot.thought.serve = serve
bot.thought.serve = serve

describe('[server]', () => {
  afterEach(() => bot.server.shutdown())
  after(() => bot.thought.serve = serveRestore)
  describe('Server', () => {
    describe('.load', () => {
      it('creates Koa server app and routers', () => {
        bot.server.load()
        expect(bot.server).to.include.keys([
          'app', 'router', 'messageRouter'
        ])
      })
    })
    describe('.start', () => {
      it('creates listening http/s server', async () => {
        bot.server.load()
        await bot.server.start()
        expect(bot.server.server.listening).to.equal(true)
      })
    })
    describe('.url', () => {
      it('returns the listening address', async () => {
        bot.server.load()
        await bot.server.start()
        expect(bot.server.url()).to.match(/127\.0\.0\.1/)
      })
    })
    describe('.publicRoutes', () => {
      it('/public returns JSON details of bot', async () => {
        bot.server.load()
        await bot.server.start()
        const res = await axios.get(`${bot.server.url()}/public`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        expect(res).to.haveOwnProperty('data')
        expect((res as any).data.name).to.equal(bot.settings.get('name'))
      })
    })
    describe('.messageRoutes', () => {
      beforeEach(() => serve.resetHistory())
      it('/message/userId/roomId calls bot.serve with message', async () => {
        bot.server.load()
        await bot.server.start()
        await axios.get(`${bot.server.url()}/message/111/222?foo=bar`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        const message = serve.args[0][0]
        expect(message).to.be.instanceof(bot.message.Server)
        expect(message.data).to.eql({ foo: 'bar' })
        expect(message.user.id).to.equal('111')
        expect(message.user.room.id).to.equal('222')
      })
      it('/message/userId/roomId response serves message ID', async () => {
        bot.server.load()
        await bot.server.start()
        const res = await axios.get(`${bot.server.url()}/message/111/222`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        const message = serve.args[0][0]
        expect((res as any).data).to.equal(message.id)
      })
      it('/message/userId response serves message without room', async () => {
        bot.server.load()
        await bot.server.start()
        const res = await axios.get(`${bot.server.url()}/message/111`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        const message = serve.args[0][0]
        expect((res as any).data).to.equal(message.id)
      })
    })
  })
})
