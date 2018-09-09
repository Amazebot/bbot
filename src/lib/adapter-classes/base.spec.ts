import 'mocha'
import * as bot from '../..'
import { expect } from 'chai'
import { Adapter } from './base'

class MockAdapter extends Adapter {
  name = 'mock-adapter'
  async start () { /* mock start */ }
  async shutdown () { /* mock shutdown */ }
}

describe('[adapter-base]', () => {
  describe('Adapter', () => {
    it('allows extending', () => {
      const mockAdapter = new MockAdapter(bot)
      expect(mockAdapter).to.be.instanceof(Adapter)
    })
    it('inherits bot properties', () => {
      const mockAdapter = new MockAdapter(bot)
      expect(mockAdapter.bot).to.include.all.keys([
        'events',
        'settings',
        'logger',
        'middlewares',
        'adapters',
        'start'
      ])
    })
  })
  describe('.parseSchema', () => {
    it('maps internal key values to given schema', () => {
      const mockAdapter = new MockAdapter(bot)
      const internal = {
        room: { name: 'testing', id: '111' },
        updated: Date.now(),
        public: false
      }
      const schema = {
        rId: 'room.id',
        room_name: 'room.name',
        updatedAt: 'updated',
        public: 'public'
      }
      expect(mockAdapter.parseSchema(internal, schema)).to.eql({
        rId: internal.room.id,
        room_name: internal.room.name,
        updatedAt: internal.updated,
        public: internal.public
      })
    })
    it('does not include undefined values', () => {
      const mockAdapter = new MockAdapter(bot)
      const internal = { room: { id: '111' } }
      const schema = { rId: 'room.id', public: 'public' }
      expect(mockAdapter.parseSchema(internal, schema)).to.eql({
        rId: internal.room.id
      })
    })
    it('does not include undefined nested attributes', () => {
      const mockAdapter = new MockAdapter(bot)
      const internal = { public: true }
      const schema = { rId: 'room.id', public: 'public' }
      expect(mockAdapter.parseSchema(internal, schema)).to.eql({
        public: internal.public
      })
    })
    it('result the target type if given', () => {
      const mockAdapter = new MockAdapter(bot)
      const internal = { room: { id: '111' } }
      const schema = { rId: 'room.id', public: 'public' }
      class Model { name = 'mock-model' }
      const converted = mockAdapter.parseSchema(internal, schema, new Model())
      expect(converted).to.eql({ name: 'mock-model', rId: internal.room.id })
      expect(converted).to.be.instanceof(Model)
    })
    it('inherits unmapped attributes from target', () => {
      const mockAdapter = new MockAdapter(bot)
      const internal = { foo: 'foo', bar: 'bar' }
      const schema = { fooToo: 'foo' }
      const converted = mockAdapter.parseSchema(internal, schema, internal)
      expect(converted).to.eql({ fooToo: 'foo', bar: 'bar' })
    })
  })
})
