import 'mocha'
import { expect } from 'chai'

import bBot from '..'

import { abstracts } from '../components/adapter'
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
  afterEach(() => bBot.reset())
  describe('.use', () => {
    it('returns adapter instance', () => {
      const shell = shellAdapter.use(bBot)
      expect(shell).to.be.instanceof(abstracts.Adapter)
    })
    it('accepts changes in bot settings before startup', async () => {
      const shell = shellAdapter.use(bBot)
      shell.debug = true
      shell.bot.config.set('name', 'shelby')
      bBot.adapters.loaded.message = shell
      await bBot.start()
      expect(bBot.config.get('name')).to.equal('shelby')
      expect(shell.bot.config.get('name')).to.equal('shelby')
    })
    it('accepts changes in bot settings after startup', async () => {
      const shell = shellAdapter.use(bBot)
      shell.debug = true
      bBot.adapters.loaded.message = shell
      shell.bot.config.set('name', 'not-shelby')
      await bBot.start()
      shell.bot.config.set('name', 'shelby')
      expect(bBot.config.get('name')).to.equal('shelby')
      expect(shell.bot.config.get('name')).to.equal('shelby')
    })
  })
})
