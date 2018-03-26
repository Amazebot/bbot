import 'mocha'
import { expect } from 'chai'
import * as yargs from 'yargs'
import mock from 'mock-fs'
import * as argv from './argv'

describe('argv', () => {
  describe('.config', () => {
    it('contains arguments collection, with defaults', () => {
      expect(argv.config).to.have.property('name', 'bot')
    })
  })
  describe('.getConfig', () => {
    it('loads config from process.argv', () => {
      yargs.parse(['--name', 'hao']) // overwrite argv
      const config = argv.getConfig()
      expect(config).to.have.property('name', 'hao')
      yargs.parse(process.argv) // replace with actual argv
    })
    it('loads configs from ENV variables using prefix', () => {
      process.env.BOT_NAME = 'henry'
      expect(argv.getConfig()).to.have.property('name', 'henry')
      delete process.env.BOT_NAME
    })
    it('loads config from package.json `bot` attribute', () => {
      expect(argv.getConfig()).to.have.property('alias', 'bbot')
    })
    /** @todo restore config file testing without crashing wallaby */
    // it('load config from a defined json file if given', () => {
    //   mock({
    //     '/mock/config.json': JSON.stringify({ name: 'harriet' })
    //   })
    //   yargs.parse(['--config', '/mock/config.json']) // overwrite argv
    //   console.log(argv.getConfig())
    //   mock.restore()
    //   yargs.parse(process.argv) // replace with actual argv
    // })
  })
})
