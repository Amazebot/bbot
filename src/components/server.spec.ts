import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'
import axios from 'axios'

import config from '../util/config'
import { thoughts } from './thought'
import { ServerMessage } from './message'
import { server } from './server'

const serve = sinon.stub(thoughts, 'serve').resolves(true)

describe('[server]', () => {
  beforeEach(() => serve.resetHistory())
  afterEach(() => server.shutdown())
  after(() => serve.restore())
  describe('Server', () => {
    describe('.load', () => {
      it('creates Koa server app and routers', () => {
        server.load()
        expect(server).to.include.keys([
          'app', 'router', 'messageRouter'
        ])
      })
    })
    describe('.start', () => {
      it('creates listening http/s server', async () => {
        server.load()
        await server.start()
        expect(server._server).to.have.property('listening', true)
      })
    })
    describe('.url', () => {
      it('returns the listening address', async () => {
        server.load()
        await server.start()
        expect(server.url).to.match(/127\.0\.0\.1/)
      })
    })
    describe('.publicRoutes', () => {
      it('/public returns JSON details of bot', async () => {
        server.load()
        await server.start()
        const res = await axios.get(`${server.url}/public`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        expect(res).to.haveOwnProperty('data')
        expect((res as any).data.name).to.equal(config.get('name'))
      })
    })
    describe('.messageRoutes', () => {
      beforeEach(() => serve.resetHistory())
      it('/message/userId/roomId calls serve with message', async () => {
        server.load()
        await server.start()
        await axios.get(`${server.url}/message/111/222?foo=bar`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        const message = serve.args[0][0]
        expect(message).to.be.instanceof(ServerMessage)
        expect(message.data).to.eql({ foo: 'bar' })
        expect(message.user.id).to.equal('111')
        expect(message.user.room.id).to.equal('222')
      })
      it('/message/userId/roomId response serves message ID', async () => {
        server.load()
        await server.start()
        const res = await axios.get(`${server.url}/message/111/222`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        const message = serve.args[0][0]
        expect((res as any).data).to.equal(message.id)
      })
      it('/message/userId response serves message without room', async () => {
        server.load()
        await server.start()
        const res = await axios.get(`${server.url}/message/111`)
          .catch((err) => expect(err).to.not.be.instanceof(Error))
        const message = serve.args[0][0]
        expect((res as any).data).to.equal(message.id)
      })
    })
  })
})
