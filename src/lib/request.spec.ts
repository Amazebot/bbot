import 'mocha'
import { expect } from 'chai'
import * as bot from '..'

// @todo replace external requests with internal 'json-server'

describe('[request]', () => {
  describe('.request', () => {
    it('handles GET request without data', async () => {
      const result = await bot.request({
        method: 'GET',
        uri: 'https://jsonplaceholder.typicode.com/users/1'
      })
      expect(result).to.include({ id: 1 })
    })
    it('handles GET request with data', async () => {
      const result = await bot.request({
        method: 'GET',
        uri: 'https://jsonplaceholder.typicode.com/posts',
        qs: { userId: 1 }
      })
      expect(result[result.length - 1]).to.include({ userId: 1 })
    })
    it('handles POST request with data', async () => {
      const result = await bot.request({
        method: 'POST',
        uri: 'https://jsonplaceholder.typicode.com/posts',
        json: true,
        body: { userId: 1 }
      })
      expect(result).to.include({ userId: 1 })
    })
  })
  describe('.getRequest', () => {
    it('handles request without data', async () => {
      const result = await bot.getRequest('https://jsonplaceholder.typicode.com/users/1')
      expect(result).to.include({ id: 1 })
    })
    it('handles request with data', async () => {
      const result = await bot.getRequest('https://jsonplaceholder.typicode.com/posts', { userId: 1 })
      expect(result[result.length - 1]).to.include({ userId: 1 })
    })
  })
  describe('.postRequest', () => {
    it('handles request with data', async () => {
      const result = await bot.postRequest('https://jsonplaceholder.typicode.com/posts', { userId: 1 })
      expect(result).to.include({ userId: 1 })
    })
  })
})
