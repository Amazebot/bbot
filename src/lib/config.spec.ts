import 'mocha'
import { expect } from 'chai'
// import mock from 'mock-fs'
import * as yargs from 'yargs'
import * as config from './config'

describe('config', () => {
  describe('.config', () => {
    it('contains arguments collection, with defaults', () => {
      expect(config.config).to.have.property('name', 'bot')
    })
  })
  describe('.getConfig', () => {
    it('loads config from process.config', () => {
      yargs.parse(['--name', 'hao']) // overwrite config
      const opts = config.getConfig()
      expect(opts).to.have.property('name', 'hao')
      yargs.parse(process.argv) // replace with actual config
    })
    it('loads configs from ENV variables using prefix', () => {
      process.env.BOT_NAME = 'henry'
      expect(config.getConfig()).to.have.property('name', 'henry')
      delete process.env.BOT_NAME
    })
    it('loads config from package.json `bot` attribute', () => {
      expect(config.getConfig()).to.have.property('alias', 'bbot')
    })
    /** @todo restore config file testing without crashing wallaby */
    // it('load config from a defined json file if given', () => {
    //   mock({
    //     '/mock/config.json': JSON.stringify({ name: 'harriet' })
    //   })
    //   yargs.parse(['--config', '/mock/config.json']) // overwrite config
    //   console.log(config.getConfig())
    //   mock.restore()
    //   yargs.parse(process.config) // replace with actual config
    // })
  })
})
