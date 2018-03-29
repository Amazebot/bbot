import { expect } from 'chai'

describe('index', () => {
  it('exports all lib modules', () => {
    expect(require('bbot')).to.include.all.keys([
      'events',
      'config',
      'logger',
      'middlewares',
      'adapters',
      'start'
    ])
  })
})
