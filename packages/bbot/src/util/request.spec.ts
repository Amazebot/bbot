import 'mocha'
import { expect } from 'chai'

import config from '../util/config'
import { server } from '../components/server'
import { Request } from './request'

const request = new Request()

// import { debug } from '../test/utils'
// debug() // 👈 route logs to console for more informative tests

describe('[request]', () => {
  before(() => {
    server.load()
    server.router.get('/pass', (ctx) => ctx.body = 'success')
    server.router.post('/pass', (ctx) => ctx.body = 'success')
    server.router.get('/json', (ctx) => ctx.body = { id: '1' })
    server.router.get('/data', (ctx) => ctx.body = { data: ctx.query })
    server.router.post('/data', (ctx) => ctx.body = { data: ctx.request.body })
    server.router.post('/empty', (ctx) => ctx.body = '')
    server.router.get('/fail', (ctx) => ctx.throw('failure'))
    return server.start()
  })
  after(() => server.shutdown())
  describe('Request', () => {
    describe('.make', () => {
      it('rejects bad request URL', () => {
        return request.make({
          method: 'GET',
          uri: `${server.url}/fail`
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err).to.be.an('error'))
      })
      it('rejects non JSON response body or timeout', () => {
        config.set('request-timeout', 200)
        return request.make({
          method: 'GET',
          uri: `${server.url}/pass`
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(typeof err).to.not.equal('undefined'))
          .then(() => config.unset('request-timeout'))
      })
      it('handles GET request without data', async () => {
        const result = await request.make({
          method: 'GET',
          uri: `${server.url}/json`
        })
        expect(result).to.include({ id: '1' })
      })
      it('handles GET request with data', async () => {
        const result = await request.make({
          method: 'GET',
          uri: `${server.url}/data`,
          qs: { userId: '1' }
        })
        expect(result.data).to.include({ userId: '1' })
      })
      it('handles POST request with data', async () => {
        const result = await request.make({
          method: 'POST',
          uri: `${server.url}/data`,
          json: true,
          body: { userId: '1' }
        })
        expect(result.data).to.include({ userId: '1' })
      })
      it('handles POST with string body', async () => {
        const result = await request.make({
          method: 'POST',
          uri: `${server.url}/pass`,
          json: true,
          body: { userId: '1' }
        })
        expect(result).to.equal('success')
        expect(typeof result.data).to.equal('undefined')
      })
      it('handles POST request without data', async () => {
        const result = await request.make({
          method: 'POST',
          uri: `${server.url}/empty`,
          json: true,
          body: { userId: '1' }
        })
        expect(typeof result).to.equal('undefined')
      })
    })
    describe('.get', () => {
      it('handles request without data', async () => {
        const result = await request.get(`${server.url}/json`)
        expect(result).to.include({ id: '1' })
      })
      it('handles request with data', async () => {
        const result = await request.get(`${server.url}/data`, { userId: '1' })
        expect(result.data).to.include({ userId: '1' })
      })
    })
    describe('.post', () => {
      it('handles request with data', async () => {
        const result = await request.post(`${server.url}/data`, { userId: '1' })
        expect(result.data).to.include({ userId: '1' })
      })
    })
  })
})
