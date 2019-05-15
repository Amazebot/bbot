import 'mocha'
import { expect } from 'chai'
import { parse } from './instance'

/** @todo tests for .clone .convert .restore */

describe('[instance]' , () => {
  describe('.parse', () => {
    it('maps internal key values to given schema', () => {
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
      expect(parse(internal, schema)).to.eql({
        rId: internal.room.id,
        room_name: internal.room.name,
        updatedAt: internal.updated,
        public: internal.public
      })
    })
    it('does not include undefined values', () => {
      const internal = { room: { id: '111' } }
      const schema = { rId: 'room.id', public: 'public' }
      expect(parse(internal, schema)).to.eql({
        rId: internal.room.id
      })
    })
    it('does not include undefined nested attributes', () => {
      const internal = { public: true }
      const schema = { rId: 'room.id', public: 'public' }
      expect(parse(internal, schema)).to.eql({
        public: internal.public
      })
    })
    it('result the target type if given', () => {
      const internal = { room: { id: '111' } }
      const schema = { rId: 'room.id', public: 'public' }
      class Model { name = 'mock-model' }
      const converted = parse(internal, schema, new Model())
      expect(converted).to.eql({ name: 'mock-model', rId: internal.room.id })
      expect(converted).to.be.instanceof(Model)
    })
    it('inherits unmapped attributes from target', () => {
      const internal = { foo: 'foo', bar: 'bar' }
      const schema = { fooToo: 'foo' }
      const converted = parse(internal, schema, internal)
      expect(converted).to.eql({ fooToo: 'foo', bar: 'bar' })
    })
  })
})
