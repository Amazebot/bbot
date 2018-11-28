import 'mocha'
import { expect } from 'chai'
import * as bot from '..'
import * as shellAdapter from './shell'

let initEnv: any

describe('[adapter-shell]', () => {
  before(() => {
    initEnv = process.env
    process.env.BOT_NAME = 'aston'
    process.env.BOT_SHELL_USER = 'carroll'
    process.env.BOT_SHELL_ROOM = 'shell'
  })
  after(() => process.env = initEnv)
  afterEach(() => bot.reset())
  describe('.use', () => {
    it('returns adapter instance', () => {
      const shell = shellAdapter.use(bot)
      expect(shell).to.be.instanceof(bot.adapter.Adapter)
    })
    it('accepts changes in bot settings before startup', async () => {
      const shell = shellAdapter.use(bot)
      shell.bot.settings.set('name', 'shelby')
      bot.adapter.adapters.message = shell
      await bot.start()
      expect(bot.settings.get('name')).to.equal('shelby')
      expect(shell.bot.settings.get('name')).to.equal('shelby')
    })
    it('accepts changes in bot settings after startup', async () => {
      const shell = shellAdapter.use(bot)
      bot.adapter.adapters.message = shell
      shell.bot.settings.set('name', 'not-shelby')
      await bot.start()
      shell.bot.settings.set('name', 'shelby')
      expect(bot.settings.get('name')).to.equal('shelby')
      expect(shell.bot.settings.get('name')).to.equal('shelby')
    })
  })
})
