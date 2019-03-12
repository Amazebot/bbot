import * as sinon from 'sinon'
import { bBot, User, TextMessage, abstracts } from '..'

/** Mock method inputs and results for easy testing. */
export const data = {
  user: new User({ id: 'mock-user' }),
  text: `Where there a foo, there's a bar. And with you, there's always a bar.`,
  memory: { test: { foo: 'bar' } },
  find: [{ test: 'test' }],
  findOne: { test: 'test' },
  nlu: {
    intent: [{ id: 'test', score: 1 }],
    entities: [{ id: 'testing' }],
    language: [{ id: 'en' }]
  }
}

/** Text message constructed from mock data. */
export const textMessage = () => new TextMessage(data.user, data.text)

/** Mock base adapter for testing return instance types. */
class Adapter extends abstracts.Adapter {
  name = 'mock-adapter'
  async start () { return }
  async shutdown () { return }
}
export const adapter = new Adapter(bBot)
export const use = sinon.spy(() => adapter)

/** Mock adapter types for manual loading in tests. */
const sandbox = sinon.createSandbox()
export const adapters = {
  message: sandbox.createStubInstance(abstracts.MessageAdapter),
  storage: sandbox.createStubInstance(abstracts.StorageAdapter),
  nlu: sandbox.createStubInstance(abstracts.NLUAdapter),
  reset: () => sandbox.reset()
}

// Return mock data from adapter methods 👇
adapters.message.start = sinon.stub()
adapters.message.shutdown = sinon.stub()
adapters.message.dispatch = sinon.stub()
adapters.nlu.start = sinon.stub()
adapters.nlu.shutdown = sinon.stub()
adapters.nlu.process = sinon.stub()
adapters.nlu.process.resolves(data.nlu)
adapters.storage.start = sinon.stub()
adapters.storage.shutdown = sinon.stub()
adapters.storage.saveMemory = sinon.stub()
adapters.storage.loadMemory = sinon.stub()
adapters.storage.loadMemory.resolves(data.memory)
adapters.storage.keep = sinon.stub()
adapters.storage.find = sinon.stub()
adapters.storage.find.resolves(data.find)
adapters.storage.findOne = sinon.stub()
adapters.storage.findOne.resolves(data.findOne)
adapters.storage.lose = sinon.stub()
