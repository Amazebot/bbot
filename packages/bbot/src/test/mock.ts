import * as sinon from 'sinon'
import { bBot } from '../bot'
import { TextMessage } from '../components/message'
import {
  Adapter,
  MessageAdapter,
  NLUAdapter,
  StorageAdapter
} from '../components/adapter/class'

/** Mock method inputs and results for easy testing. */
export const data = {
  user: { id: 'mock-user', name: 'mock-user', room: { id: 'mock-room' } },
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
class MockAdapter extends Adapter {
  name = 'mock-adapter'
  async start () { return }
  async shutdown () { return }
}
export const mockAdapter = new MockAdapter(bBot)
export const use = sinon.spy(() => mockAdapter)

/** Mock adapter types for manual loading in tests. */
const sandbox = sinon.createSandbox()
export const adapters = {
  message: sandbox.createStubInstance(MessageAdapter, {
    start: sinon.stub(),
    shutdown: sinon.stub(),
    dispatch: sinon.stub()
  }),
  nlu: sandbox.createStubInstance(NLUAdapter, {
    start: sinon.stub(),
    shutdown: sinon.stub(),
    process: sinon.stub().resolves(data.nlu) as any
  }),
  storage: sandbox.createStubInstance(StorageAdapter, {
    start: sinon.stub(),
    shutdown: sinon.stub(),
    saveMemory: sinon.stub(),
    loadMemory: sinon.stub().resolves(data.memory) as any,
    keep: sinon.stub(),
    find: sinon.stub().resolves(data.find) as any,
    findOne: sinon.stub().resolves(data.findOne) as any,
    lose: sinon.stub()
  }),
  reset: () => sandbox.reset()
}
