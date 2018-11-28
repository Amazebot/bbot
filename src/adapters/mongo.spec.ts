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
    'test-user-1': bot.user.create({ id: 'test-user-1' }),
    'test-user-2': bot.user.create({ id: 'test-user-2' })
  },
  private: {
    'last-respond-time': Date.parse('01 Jun 2018 01:30:00 GMT'),
    'custom': 'A custom piece of data stored in memory'
  }
}
const testStore = [
  { id: '001', name: 'Foo', student: { grade: 'C', year: '2018' } },
  { id: '002', name: 'Bar', student: { grade: 'A', year: '2018' } },
  { id: '003', name: 'Bar', student: { grade: 'B', year: '2017' } }
]
const clean = async () => {
  if (!adapter.model.db.db) return
  const found = await adapter.model.db.db.listCollections({ name: testCollection }).toArray()
  if (found.length) await adapter.model.collection.drop()
}
let adapter: mongo.Mongo

describe('[adapter-mongo]', () => {
  before(() => {
    initEnv = process.env
    process.env.BOT_DB_URL = testMongo
    process.env.BOT_DB_COLLECTION = testCollection
  })
  beforeEach(() => adapter = mongo.use(bot))
  after(() => process.env = initEnv)
  describe('.use', () => {
    it('returns adapter instance', () => {
      expect(adapter).to.be.instanceof(bot.adapter.Adapter)
    })
    it('adds env settings for DB to bot settings', () => {
      expect(bot.settings.get('db-collection')).to.equal(testCollection)
    })
    it('creates mongoose model for configured collection', () => {
      expect(adapter.model.collection.name).to.equal(testCollection)
    })
    it('uses bot name for mongo url if no env setting', () => {
      delete process.env.DB_URL
      bot.settings.set('name', 'mongo-test')
      adapter = mongo.use(bot)
    })
  })
  describe('.start', () => {
    it('creates connection to database', async () => {
      bot.settings.set('db-url', testMongo)
      await adapter.start()
      const stats = await adapter.store!.connection.db.stats()
      expect(adapter.store!.connection.readyState).to.equal(1)
      expect(stats.db).to.equal(testDB)
      await adapter.shutdown()
    })
  })
  describe('.shutdown', async () => {
    it('closes the database connection', async () => {
      bot.settings.set('db-url', testMongo)
      await adapter.start()
      await adapter.shutdown()
      expect(adapter.store!.connection.readyState).to.equal(0)
    })
  })
  describe('.saveMemory', () => {
    beforeEach(async () => {
      await adapter.start()
      await clean()
    })
    afterEach(async () => {
      await adapter.shutdown()
    })
    it('stores each memory sub-collection', async () => {
      await adapter.saveMemory(testMemory)
      const found = await mongo.getModel(testCollection).find({
        type: 'memory'
      }, { _id: 0, data: 1, sub: 1 }).lean().exec()
      expect(found).to.eql([
        { sub: 'users', data: testMemory.users },
        { sub: 'private', data: testMemory.private }
      ])
    })
  })
  describe('.loadMemory', () => {
    before(() => adapter.start())
    beforeEach(async () => {
      await clean()
      await adapter.saveMemory(testMemory)
    })
    after(async () => adapter.shutdown())
    it('loads each memory back to sub-collections', async () => {
      const memory = await adapter.loadMemory()
      expect(memory).to.eql(testMemory)
    })
    it('loads each value with its original type', async () => {
      const memory = await adapter.loadMemory()
      expect(memory.users['test-user-1']).to.be.instanceof(bot.user.User)
    })
  })
  describe('.keep', () => {
    beforeEach(async () => {
      await adapter.start()
      await clean()
    })
    afterEach(async () => {
      await adapter.shutdown()
    })
    it('adds data to collection series', async () => {
      await adapter.keep('tests', testStore[0])
      const tests = await mongo.getModel(testCollection).findOne({
        sub: 'tests',
        type: 'store'
      }).lean().exec()
      expect(tests.data).to.eql([testStore[0]])
    })
    it('subsequent calls append to collection', async () => {
      for (let test of testStore) await adapter.keep('tests', test)
      const tests = await mongo.getModel(testCollection).findOne({
        sub: 'tests',
        type: 'store'
      }).lean().exec()
      expect(tests.data).to.eql(testStore)
    })
    it('keeps matches intact for state branches', async () => {
      const b = bot.state.create({
        message: bot.message.text(bot.user.blank(), '_')
      })
      const branches = [
        new bot.branch.Custom(() => 1, () => 1, { id: 'A', force: true }),
        new bot.branch.Custom(() => 2, () => 2, { id: 'B', force: true })
      ]
      for (let branch of branches) {
        await branch.process(b, new bot.middleware.Middleware('test'))
      }
      await adapter.keep('states', bot.util.convert(b))
      const states = await mongo.getModel(testCollection).findOne({
        sub: 'states',
        type: 'store'
      }).lean().exec()
      expect(states.data[0].branches.map((l: any) => l.match)).to.eql([1, 2])
    })
  })
  describe('.find', () => {
    beforeEach(async () => {
      await adapter.start()
      await clean()
      for (let test of testStore) await adapter.keep('tests', test)
    })
    afterEach(async () => {
      await adapter.shutdown()
    })
    it('returns sub collection matching params', async () => {
      const result = await adapter.find('tests', { name: testStore[1].name })
      expect(result).to.eql([ testStore[1], testStore[2] ])
    })
    it('returns sub collection matching params using path', async () => {
      const result = await adapter.find('tests', { 'student.grade': 'B' })
      expect(result).to.eql([ testStore[2] ])
    })
    it('returns whole collection if no param keys given', async () => {
      const result = await adapter.find('tests', {})
      expect(result).to.eql(testStore)
    })
    it('returns undefined if none match', async () => {
      const result = await adapter.find('tests', { name: 'NoName' })
      expect(result).to.equal(undefined)
    })
  })
  describe('.find', () => {
    beforeEach(async () => {
      await adapter.start()
      await clean()
      for (let test of testStore) await adapter.keep('tests', test)
    })
    afterEach(async () => {
      await adapter.shutdown()
    })
    it('returns item from sub collection matching params', async () => {
      const result = await adapter.findOne('tests', { name: testStore[1].name })
      expect(result).to.eql(testStore[1])
    })
    it('returns undefined if none match', async () => {
      const result = await adapter.findOne('tests', { name: 'NoName' })
      expect(result).to.equal(undefined)
    })
  })
  describe('.lose', () => {
    beforeEach(async () => {
      await adapter.start()
      await clean()
      for (let test of testStore) await adapter.keep('tests', test)
    })
    afterEach(async () => {
      await adapter.shutdown()
    })
    it('removes items matching params from sub collection', async () => {
      await adapter.lose('tests', { name: testStore[1].name })
      const remaining = await mongo.getModel(testCollection).findOne({
        type: 'store',
        sub: 'tests'
      }, { _id: 0, data: 1 }).lean().exec()
      expect(remaining.data).to.eql([ testStore[0] ])
    })
    it('removes only matching items from sub collection', async () => {
      await adapter.lose('tests', { name: testStore[0].name })
      const remaining = await mongo.getModel(testCollection).findOne({
        type: 'store',
        sub: 'tests'
      }, { _id: 0, data: 1 }).lean().exec()
      expect(remaining.data).to.eql([ testStore[1], testStore[2] ])
    })
  })
})
