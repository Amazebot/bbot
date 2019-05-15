import sinon from 'sinon'
import { expect } from 'chai'
import LRU from 'lru-cache'
import { Cache } from './cache'

// Instance method variance for testing cache
const mockInstance = { call: sinon.stub() }
mockInstance.call.withArgs('methodOne').onCall(0).returns({ result: 'foo' })
mockInstance.call.withArgs('methodOne').onCall(1).returns({ result: 'bar' })
mockInstance.call.withArgs('methodTwo', 'key1').returns({ result: 'value1' })
mockInstance.call.withArgs('methodTwo', 'key2').returns({ result: 'value2' })
let cache: Cache

describe('[cache]', () => {
  beforeEach(() => {
    mockInstance.call.resetHistory()
    cache = new Cache(mockInstance)
  })
  describe('.setup', () => {
    it('returns a cache for method calls', () => {
      expect(cache.setup('anyMethod')).to.be.instanceof(LRU)
    })
    it('accepts options overriding defaults', () => {
      const methodCache = cache.setup('methodOne', { maxAge: 3000 })
      expect(methodCache.max).to.equal(cache.defaults.max)
      expect(methodCache.maxAge).to.equal(3000)
    })
  })
  describe('.call', () => {
    it('throws if method does not exist', () => {
      const badUse = () => cache.call('bad', 'key1')
      expect(badUse).to.throw()
    })
    it('returns a promise', () => {
      expect(cache.call('methodOne', 'key1').then).to.be.a('function')
    })
    it('calls the method with the key', () => {
      return cache.call('methodTwo', 'key1').then((result) => {
        expect(result).to.equal('value1')
      })
    })
    it('only calls the method once', () => {
      cache.call('methodOne', 'key1')
      cache.call('methodOne', 'key1')
      expect(mockInstance.call.callCount).to.equal(1)
    })
    it('returns cached result on subsequent calls', () => {
      return Promise.all([
        cache.call('methodOne', 'key1'),
        cache.call('methodOne', 'key1')
      ]).then((results) => {
        expect(results[0]).to.equal(results[1])
      })
    })
    it('calls again if cache expired', () => {
      const clock = sinon.useFakeTimers()
      cache.setup('methodOne', { maxAge: 10 })
      const result1 = cache.call('methodOne', 'key1')
      clock.tick(20)
      const result2 = cache.call('methodOne', 'key1')
      clock.restore()
      return Promise.all([result1, result2]).then((results) => {
        expect(mockInstance.call.callCount).to.equal(2)
        expect(results[0]).to.not.equal(results[1])
      })
    })
  })
  describe('.has', () => {
    it('returns true if the method cache was created', () => {
      cache.setup('methodOne')
      expect(cache.has('methodOne')).to.equal(true)
    })
    it('returns true if the method was called with cache', () => {
      cache.call('methodOne', 'key')
      expect(cache.has('methodOne')).to.equal(true)
    })
    it('returns false if the method is not cached', () => {
      expect(cache.has('methodThree')).to.equal(false)
    })
  })
  describe('.get', () => {
    it('returns cached result from last call with key', () => {
      return cache.call('methodOne', 'key1').then((result) => {
        expect(cache.get('methodOne', 'key1')).to.equal(result)
      })
    })
  })
  describe('.reset', () => {
    it('removes cached results for a method and key', () => {
      const result1 = cache.call('methodOne', 'key1')
      cache.reset('methodOne', 'key1')
      const result2 = cache.call('methodOne', 'key1')
      expect(result1).not.to.equal(result2)
    })
    it('does not remove cache of calls with different key', () => {
      cache.call('methodTwo', 'key1')
      cache.call('methodTwo', 'key2')
      cache.reset('methodTwo', 'key1')
      const result = cache.get('methodTwo', 'key2')
      expect(result).to.equal('value2')
    })
    it('without key, removes all results for method', () => {
      cache.call('methodTwo', 'key1')
      cache.call('methodTwo', 'key2')
      cache.reset('methodTwo')
      const result1 = cache.get('methodTwo', 'key1')
      const result2 = cache.get('methodTwo', 'key2')
      expect(result1).to.equal(undefined)
      expect(result2).to.equal(undefined)
    })
  })
  describe('.resetAll', () => {
    it('resets all cached methods', () => {
      cache.call('methodOne', 'key1')
      cache.call('methodTwo', 'key1')
      cache.resetAll()
      cache.call('methodOne', 'key1')
      cache.call('methodTwo', 'key1')
      expect(mockInstance.call.callCount).to.equal(4)
    })
  })
})
