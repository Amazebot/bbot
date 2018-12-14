import 'mocha'
import { expect } from 'chai'
import { config } from './config'
let initEnv: any

describe('[config]', () => {
  before(() => initEnv = process.env)
  beforeEach(() => delete process.env.BOT_NAME)
  afterEach(() => config.reset())
  after(() => process.env = initEnv)
  describe('.load', () => {
    it('loads default bot name', () => {
      config.load()
      expect(config.get('name')).to.equal('bot')
    })
    it('loads name from env', () => {
      process.env.BOT_NAME = 'test-bot'
      config.load()
      expect(config.get('name')).to.equal('test-bot')
    })
  })
})
