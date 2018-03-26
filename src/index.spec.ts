import { expect } from 'chai'

describe('index', () => {
  it('exports all lib modules', () => {
    expect(Object.keys(require('bbot'))).to.eql([
      'argv',
      'bot',
      'logger',
      'middleware'
    ])
  })
})
