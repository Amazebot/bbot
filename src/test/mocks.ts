import * as sinon from 'sinon'
import {
  bBot,
  User,
  TextMessage,
  abstracts
} from '..'

export const user = new User({ id: 'mock-user' })

export const text = `Where there a foo, there's a bar. And with you, there's always a bar.`

export const memory = { test: { foo: 'bar' } }

export const find = [{ test: 'test' }]

export const findOne = { test: 'test' }

export const nlu = {
  intent: [{ id: 'test', score: 1 }],
  entities: [{ id: 'testing' }],
  language: [{ id: 'en' }]
}

export const textMessage = () => new TextMessage(user, text)

export class MockAdapter extends abstracts.Adapter {
  name = 'mock-adapter'
  async start () { return }
  async shutdown () { return }
}
export const mockAdapter = () => new MockAdapter(bBot)
export const use = sinon.spy(() => mockAdapter())

export class MockMessageAdapter extends abstracts.MessageAdapter {
  name = 'mock-message-adapter'
  async start () { return }
  async shutdown () { return }
  async dispatch () { return }
}
export const messageAdapter = () => new MockMessageAdapter(bBot)

export type MockMessageAdapterStub = sinon.SinonStubbedInstance<MockMessageAdapter> & {
  start: sinon.SinonStub
  shutdown: sinon.SinonStub
  dispatch: sinon.SinonStub
}
export const stubMessageAdapter = () => sinon.createStubInstance(MockMessageAdapter)

export class MockNLUAdapter extends abstracts.NLUAdapter {
  name = 'mock-nlu-adapter'
  async start () { return }
  async shutdown () { return }
  async process () { return nlu }
}
export const nluAdapter = () => new MockNLUAdapter(bBot)

export type MockNLUAdapterStub = sinon.SinonStubbedInstance<MockNLUAdapter> & {
  start: sinon.SinonStub
  shutdown: sinon.SinonStub
  process: sinon.SinonStub
}
export const stubNLUAdapter = () => {
  const stubAdapter: MockNLUAdapterStub = sinon.createStubInstance(MockNLUAdapter)
  stubAdapter.process.resolves(nlu)
  return stubAdapter
}

export class MockStorageAdapter extends abstracts.StorageAdapter {
  name = 'mock-storage-adapter'
  async start () { return }
  async shutdown () { return }
  async saveMemory () { return }
  async loadMemory () { return memory }
  async keep () { return }
  async find () { return find }
  async findOne () { return findOne }
  async lose () { return }
}
export const storageAdapter = () => new MockStorageAdapter(bBot)

export type MockStorageAdapterStub = sinon.SinonStubbedInstance<MockStorageAdapter> & {
  start: sinon.SinonStub
  shutdown: sinon.SinonStub
  saveMemory: sinon.SinonStub
  loadMemory: sinon.SinonStub
  keep: sinon.SinonStub
  find: sinon.SinonStub
  findOne: sinon.SinonStub
  lose: sinon.SinonStub
}
export const stubStorageAdapter = () => {
  const adapterStub: MockStorageAdapterStub = sinon.createStubInstance(MockStorageAdapter)
  adapterStub.loadMemory.resolves(memory)
  adapterStub.find.resolves(find)
  adapterStub.findOne.resolves(findOne)
  return adapterStub
}
