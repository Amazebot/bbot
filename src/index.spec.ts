import { expect } from 'chai'
import * as b from 'bbot'

describe('index:', () => {
  it('exports all lib members', () => {
    expect(Object.keys(b)).to.eql([
      'bot'
    ])
  })
})