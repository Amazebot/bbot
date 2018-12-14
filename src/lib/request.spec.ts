import 'mocha'
import { expect } from 'chai'
import * as bot from '.'

describe('[request]', () => {
  before(() => {
    bot.server.load()
    bot.server.router.get('/pass', (ctx) => ctx.body = 'success')
    bot.server.router.get('/json', (ctx) => ctx.body = { id: '1' })
    bot.server.router.get('/data', (ctx) => ctx.body = { data: ctx.query })
    bot.server.router.post('/data', (ctx) => ctx.body = { data: ctx.body })
    bot.server.router.get('/fail', (ctx) => ctx.throw('failure'))
    return bot.server.start()
  })
  after(() => bot.server.shutdown())
  describe('Request', () => {
    describe('.make', () => {
      it('rejects bad request URL', () => {
        return bot.request.make({
          method: 'GET',
          uri: `${bot.server.url()}/fail`
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err).to.be.an('error'))
      })
      it('rejects non JSON response body or timeout', () => {
        bot.config.set('request-timeout', 200)
        return bot.request.make({
          method: 'GET',
          uri: `${bot.server.url()}/pass`
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err).to.be.an('error'))
          .then(() => bot.config.unset('request-timeout'))
      })
      it('handles GET request without data', async () => {
        const result = await bot.request.make({
          method: 'GET',
          uri: `${bot.server.url()}/json`
        })
        expect(result).to.include({ id: '1' })
      })
      it('handles GET request with data', async () => {
        const result = await bot.request.make({
          method: 'GET',
          uri: `${bot.server.url()}/data`,
          qs: { userId: '1' }
        })
        expect(result.data).to.include({ userId: '1' })
      })
      it('handles POST request with data', async () => {
        const result = await bot.request.make({
          method: 'POST',
          uri: `${bot.server.url()}/data`,
          json: true,
          body: { userId: '1' }
        })
        expect(result.data).to.include({ userId: '1' })
      })
    })
    describe('.get', () => {
      it('handles request without data', async () => {
        const result = await bot.request.get(`${bot.server.url()}/json`)
        expect(result).to.include({ id: '1' })
      })
      it('handles request with data', async () => {
        const result = await bot.request.get(`${bot.server.url()}/data`, { userId: '1' })
        expect(result.data).to.include({ userId: '1' })
      })
    })
    describe('.post', () => {
      it('handles request with data', async () => {
        const result = await bot.request.post(`${bot.server.url()}/data`, { userId: '1' })
        expect(result.data).to.include({ userId: '1' })
      })
    })
  })
})
