import 'mocha'
import { expect } from 'chai'
import { config } from './config'
let initEnv: any

config.reset()

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
  describe('.extend', () => {
    it('adds options/defaults to config (after load)', () => {
      config.load()
      config.extend({
        'test-opt': {
          type: 'string',
          description: 'Adds a new setting for tests.',
          default: `test`
        }
      })
      config.load()
      expect(config.get('test-opt')).to.equal('test')
    })
  })
})
