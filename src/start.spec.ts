import { expect } from 'chai'

describe('start', () => {
  it('runs async bot startup', () => {
    require('bbot/dist/start').then((bbot) => {
      expect(bbot.getStatus()).to.equal('started')
    })
  })
})
