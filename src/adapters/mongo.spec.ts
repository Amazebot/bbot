import 'mocha'
import { expect } from 'chai'
import * as bot from '..'
import * as mongo from './mongo'

let initEnv: any
const testDB = 'bbot-test'
const testMongo = 'mongodb://127.0.0.1:27017/' + testDB
const testCollection = 'brain-testing'
const testMemory = {
  users: {
    'test-user-1': new bot.User({ id: 'test-user-1' }),
    'test-user-2': new bot.User({ id: 'test-user-2' })
  },
  private: {
    'last-respond-time': Date.parse('01 Jun 2018 01:30:00 GMT'),
    'custom': 'A custom piece of data stored in memory'
  }
}
const testStore = [
  { id: '001', name: 'Foo' },
  { id: '002', name: 'Bar' },
  { id: '003', name: 'Bar' }
]
const clean = async () => {
  const found = await store.model.db.db.listCollections({ name: testCollection }).toArray()
  if (found.length) await store.model.collection.drop()
}

let store: mongo.Mongo

describe('mongo', () => {
  before(() => {
    initEnv = process.env
    process.env.MONGODB_URL = testMongo
    process.env.BRAIN_COLLECTION = testCollection
  })
  after(() => {
    process.env = initEnv
  })
  describe('.use', () => {
    beforeEach(() => store = undefined)
    it('returns adapter instance', () => {
      store = mongo.use(bot)
      expect(store).to.be.instanceof(bot.Adapter)
    })
    it('config inherits env settings', () => {
      store = mongo.use(bot)
      expect(store.config.collection).to.equal(testCollection)
    })
    it('creates mongoose model for configured collection', () => {
      store = mongo.use(bot)
      expect(store.model.collection.name).to.equal(testCollection)
    })
  })
  describe('.start', () => {
    beforeEach(() => store = undefined)
    it('creates connection to database', async () => {
      store = mongo.use(bot)
      store.config.url = testMongo
      await store.start()
      const stats = await store.store.connection.db.stats()
      expect(store.store.connection.readyState).to.equal(1)
      expect(stats.db).to.equal(testDB)
      await store.shutdown()
    })
  })
  describe('.shutdown', async () => {
    beforeEach(() => store = undefined)
    it('closes the database connection', async () => {
      store = mongo.use(bot)
      store.config.url = testMongo
      await store.start()
      await store.shutdown()
      expect(store.store.connection.readyState).to.equal(0)
    })
  })
  describe('.saveMemory', () => {
    beforeEach(async () => {
      store = mongo.use(bot)
      await store.start()
      await clean()
    })
    afterEach(async () => {
      await store.shutdown()
    })
    it('stores each memory sub-collection', async () => {
      await store.saveMemory(testMemory)
      const found = await store.store.model(testCollection).find({
        type: 'memory'
      }, { _id: 0, data: 1, sub: 1 }).lean().exec()
      expect(found).to.eql([
        { sub: 'users', data: testMemory.users },
        { sub: 'private', data: testMemory.private }
      ])
    })
  })
  describe('.loadMemory', () => {
    beforeEach(async () => {
      store = mongo.use(bot)
      await store.start()
      await clean()
      await store.saveMemory(testMemory)
    })
    afterEach(async () => {
      await store.shutdown()
    })
    it('loads each memory back to sub-collections', async () => {
      const memory = await store.loadMemory()
      expect(memory).to.eql(testMemory)
    })
    it('loads each value with its original type', async () => {
      const memory = await store.loadMemory()
      expect(memory.users['test-user-1']).to.be.instanceof(bot.User)
    })
  })
  describe('.keep', () => {
    beforeEach(async () => {
      store = mongo.use(bot)
      await store.start()
      await clean()
    })
    afterEach(async () => {
      await store.shutdown()
    })
    it('adds data to collection series', async () => {
      await store.keep('tests', testStore[0])
      const tests = await store.store.model(testCollection).findOne({
        sub: 'tests',
        type: 'store'
      }).lean().exec()
      expect(tests.data).to.eql([testStore[0]])
    })
    it('subsequent calls append to collection', async () => {
      for (let test of testStore) await store.keep('tests', test)
      const tests = await store.store.model(testCollection).findOne({
        sub: 'tests',
        type: 'store'
      }).lean().exec()
      expect(tests.data).to.eql(testStore)
    })
  })
  describe('.find', () => {
    beforeEach(async () => {
      store = mongo.use(bot)
      await store.start()
      await clean()
      for (let test of testStore) await store.keep('tests', test)
    })
    afterEach(async () => {
      await store.shutdown()
    })
    it('returns sub collection matching params', async () => {
      const result = await store.find('tests', { name: testStore[1].name })
      expect(result).to.eql([ testStore[1], testStore[2] ])
    })
    it('returns undefined if none match', async () => {
      const result = await store.find('tests', { name: 'NoName' })
      expect(result).to.equal(undefined)
    })
  })
  describe('.find', () => {
    beforeEach(async () => {
      store = mongo.use(bot)
      await store.start()
      await clean()
      for (let test of testStore) await store.keep('tests', test)
    })
    afterEach(async () => {
      await store.shutdown()
    })
    it('returns item from sub collection matching params', async () => {
      const result = await store.findOne('tests', { name: testStore[1].name })
      expect(result).to.eql(testStore[1])
    })
    it('returns undefined if none match', async () => {
      const result = await store.findOne('tests', { name: 'NoName' })
      expect(result).to.equal(undefined)
    })
  })
  describe('.lose', () => {
    beforeEach(async () => {
      store = mongo.use(bot)
      await store.start()
      await clean()
      for (let test of testStore) await store.keep('tests', test)
    })
    afterEach(async () => {
      await store.shutdown()
    })
    it('removes items matching params from sub collection', async () => {
      await store.lose('tests', { name: testStore[1].name })
      const remaining = await store.store.model(testCollection).findOne({
        type: 'store',
        sub: 'tests'
      }, { _id: 0, data: 1 }).lean().exec()
      expect(remaining.data).to.eql([ testStore[0] ])
    })
    it('removes only matching items from sub collection', async () => {
      await store.lose('tests', { name: testStore[0].name })
      const remaining = await store.store.model(testCollection).findOne({
        type: 'store',
        sub: 'tests'
      }, { _id: 0, data: 1 }).lean().exec()
      expect(remaining.data).to.eql([ testStore[1], testStore[2] ])
    })
  })
})
