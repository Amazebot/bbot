import 'mocha'
import * as sinon from 'sinon'
import { expect } from 'chai'

import middlewares from './middlewares'
import { Middleware } from '../components/middleware'

describe('[middlewares]', () => {
  describe('.loadAll', () => {
    it('creates middleware for each thought process', () => {
      middlewares.loadAll()
      expect(middlewares.stacks).to.include.all.keys([
        'hear', 'listen', 'understand', 'act', 'respond', 'remember'
      ])
    })
    it('creates all middleware instances', () => {
      middlewares.loadAll()
      for (let key in middlewares.stacks) {
        expect(middlewares.stacks[key]).to.be.instanceof(Middleware)
      }
    })
  })
  describe('.unloadAll', () => {
    it('deletes all middleware instances', () => {
      middlewares.loadAll()
      middlewares.unloadAll()
      expect(middlewares.stacks).to.eql({})
    })
  })
  describe('.register', () => {
    it('registers piece in hear stack', () => {
      middlewares.loadAll()
      const mockPiece = sinon.spy()
      middlewares.register('hear', mockPiece)
      expect(middlewares.stacks.hear!.stack[0]).to.eql(mockPiece)
    })
    it('registers piece in listen stack', () => {
      middlewares.loadAll()
      const mockPiece = sinon.spy()
      middlewares.register('listen', mockPiece)
      expect(middlewares.stacks.listen!.stack[0]).to.eql(mockPiece)
    })
    it('registers piece in understand stack', () => {
      middlewares.loadAll()
      const mockPiece = sinon.spy()
      middlewares.register('understand', mockPiece)
      expect(middlewares.stacks.understand!.stack[0]).to.eql(mockPiece)
    })
    it('registers piece in act stack', () => {
      middlewares.loadAll()
      const mockPiece = sinon.spy()
      middlewares.register('act', mockPiece)
      expect(middlewares.stacks.act!.stack[0]).to.eql(mockPiece)
    })
    it('registers piece in respond stack', () => {
      middlewares.loadAll()
      const mockPiece = sinon.spy()
      middlewares.register('respond', mockPiece)
      expect(middlewares.stacks.respond!.stack[0]).to.eql(mockPiece)
    })
    it('registers piece in remember stack', () => {
      middlewares.loadAll()
      const mockPiece = sinon.spy()
      middlewares.register('remember', mockPiece)
      expect(middlewares.stacks.remember!.stack[0]).to.eql(mockPiece)
    })
  })
})
