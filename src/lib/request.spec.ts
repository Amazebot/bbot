import 'mocha'
import { expect } from 'chai'
import * as bot from '..'

// @todo replace external requests with internal 'json-server'

describe('[request]', () => {
  describe('Request', () => {
    describe('.make', () => {
      it('rejects bad request URL', () => {
        return bot.request.make({
          method: 'GET',
          uri: 'https://I.AM.BAD.URL'
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err).to.be.an('error'))
      })
      it('rejects non JSON response body or timeout', () => {
        bot.settings.set('request-timeout', 200)
        return bot.request.make({
          method: 'GET',
          uri: 'https://google.com'
        })
          .then(() => expect(true).to.equal(false))
          .catch((err) => expect(err).to.be.an('error'))
          .then(() => bot.settings.unset('request-timeout'))
      })
      it('handles GET request without data', async () => {
        const result = await bot.request.make({
          method: 'GET',
          uri: 'https://jsonplaceholder.typicode.com/users/1'
        })
        expect(result).to.include({ id: 1 })
      })
      it('handles GET request with data', async () => {
        const result = await bot.request.make({
          method: 'GET',
          uri: 'https://jsonplaceholder.typicode.com/posts',
          qs: { userId: 1 }
        })
        expect(result[result.length - 1]).to.include({ userId: 1 })
      })
      it('handles POST request with data', async () => {
        const result = await bot.request.make({
          method: 'POST',
          uri: 'https://jsonplaceholder.typicode.com/posts',
          json: true,
          body: { userId: 1 }
        })
        expect(result).to.include({ userId: 1 })
      })
    })
    describe('.get', () => {
      it('handles request without data', async () => {
        const result = await bot.request.get('https://jsonplaceholder.typicode.com/users/1')
        expect(result).to.include({ id: 1 })
      })
      it('handles request with data', async () => {
        const result = await bot.request.get('https://jsonplaceholder.typicode.com/posts', { userId: 1 })
        expect(result[result.length - 1]).to.include({ userId: 1 })
      })
    })
    describe('.post', () => {
      it('handles request with data', async () => {
        const result = await bot.request.post('https://jsonplaceholder.typicode.com/posts', { userId: 1 })
        expect(result).to.include({ userId: 1 })
      })
    })
  })
})
