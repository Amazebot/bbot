import 'mocha'
import { expect } from 'chai'
import * as yargs from 'yargs'
import * as bot from '..'
let initEnv: any

describe('[settings]', () => {
  before(() => {
    initEnv = process.env
    delete process.env.BOT_NAME
  })
  beforeEach(() => {
    delete process.env.BOT_NAME
    bot.settings.reset()
  })
  after(() => process.env = initEnv)
  describe('Settings', () => {
    describe('.load', () => {
      it('allows overwrite of saved config with update settings', () => {
        process.env.BOT_NAME = 'thierry'
        expect(bot.settings.config.name).to.equal('thierry')
        process.env.BOT_NAME = 'philippe'
        bot.settings.load()
        expect(bot.settings.config.name).to.equal('philippe')
      })
      it('allows overwrite of save config with new options', () => {
        expect(typeof bot.settings.config.isFoo).to.equal('undefined')
        bot.settings.options['is-foo'] = {
          type: 'boolean',
          description: 'testing a new option',
          default: true
        }
        bot.settings.load()
        expect(typeof bot.settings.config.isFoo).to.equal('boolean')
      })
      it('retains manually assigned configs as default', () => {
        bot.settings.set('name', 'foo')
        bot.settings.load()
        expect(bot.settings.config.name).to.equal('foo')
      })
      it('retains added options and their config', () => {
        bot.settings.options['is-foo'] = {
          type: 'boolean',
          description: 'testing a new option',
          default: false
        }
        bot.settings.config = bot.settings.load()
        bot.settings.set('is-foo', true)
        bot.settings.set('name', 'foo')
        bot.settings.load()
        expect(bot.settings.config.isFoo).to.equal(true)
        expect(bot.settings.config.name).to.equal('foo')
      })
    })
    describe('.reset', () => {
      it('returns assigned config to its original default', () => {
        bot.settings.set('name', 'foo')
        bot.settings.reset()
        expect(bot.settings.config.name).to.equal('bot')
      })
      it('re-assigns environment default overrides', () => {
        process.env.BOT_NAME = 'bar'
        bot.settings.set('name', 'foo')
        bot.settings.reset()
        expect(bot.settings.config.name).to.equal('bar')
      })
      it('nothing inherited after reload', () => {
        bot.settings.set('name', 'foo')
        bot.settings.load()
        bot.settings.reset()
        expect(bot.settings.config.name).to.equal('bot')
      })
      it('inherits original defaults', () => {
        delete process.env['BOT_MESSAGE_ADAPTER']
        const defaultM = bot.settings.options['message-adapter'].default
        bot.settings.set('message-adapter', '')
        bot.settings.reset()
        expect(bot.settings.config['message-adapter']).to.equal(defaultM)
      })
    })
    describe('.extend', () => {
      beforeEach(() => bot.settings.reset())
      it('allows defining new options after load', () => {
        process.env.BOT_FOO = 'bar'
        expect(typeof bot.settings.config.foo).to.equal('undefined')
        bot.settings.extend({ 'foo': { type: 'string' } })
        expect(bot.settings.config.foo).to.equal('bar')
      })
    })
    describe('.name', () => {
      beforeEach(() => bot.settings.reset())
      it('provides shortcut to name from config', () => {
        bot.settings.set('name', 'foo1')
        expect(bot.settings.config.name).to.equal('foo1')
      })
      it('validates and reformats safe username', () => {
        bot.settings.set('name', 'f()!o@#o2')
        expect(bot.settings.config.name).to.equal('foo2')
      })
    })
    describe('.alias', () => {
      beforeEach(() => bot.settings.reset())
      it('provides shortcut to alias from config', () => {
        bot.settings.set('alias', 'foo1')
        expect(bot.settings.config.alias).to.equal('foo1')
      })
      it('validates and reformats safe alias', () => {
        bot.settings.set('alias', 'f()!o@#o2')
        expect(bot.settings.config.alias).to.equal('foo2')
      })
    })
    describe('.set', () => {
      beforeEach(() => bot.settings.reset())
      it('assigns the given setting and all alias settings', () => {
        bot.settings.extend({
          'foo-bar': {
            type: 'string',
            describe: 'A test setting',
            alias: 'fb'
          }
        })
        bot.settings.set('fooBar', 'foo')
        expect(bot.settings.get('fooBar')).to.equal('foo')
        expect(bot.settings.get('foo-bar')).to.equal('foo')
        bot.settings.set('foo-bar', 'bar')
        expect(bot.settings.get('fooBar')).to.equal('bar')
        expect(bot.settings.get('foo-bar')).to.equal('bar')
      })
      it('retains settings after extending', () => {
        process.env.BOT_NAME = 'foo'
        bot.settings.set('name', 'bar')
        bot.settings.extend({ 'bar': { type: 'string', describe: 'test' } })
        expect(bot.settings.get('name')).to.equal('bar')
      })
    })
    describe('.unset', () => {
      beforeEach(() => bot.settings.reset())
      it('removes settings from config', () => {
        bot.settings.set('foo', 'foo')
        bot.settings.unset('foo')
        expect(typeof bot.settings.config['foo']).to.equal('undefined')
      })
      it('restores defaults for options', () => {
        bot.settings.set('name', 'foo')
        bot.settings.unset('name')
        expect(bot.settings.config.name).to.equal('bot')
      })
    })
  })
  describe('.config', () => {
    beforeEach(() => bot.settings.reset())
    it('contains arguments collection, with defaults', () => {
      expect(bot.settings).to.have.property('name', 'bot')
    })
  })
  describe('.getConfig', () => {
    beforeEach(() => bot.settings.reset())
    it('loads config from process.config', () => {
      yargs.parse(['--name', 'hao']) // overwrite config
      expect(bot.settings.getConfig()).to.have.property('name', 'hao')
      yargs.parse(process.argv) // replace with actual config
    })
    it('loads configs from ENV variables using prefix', () => {
      process.env.BOT_NAME = 'henry'
      expect(bot.settings.getConfig()).to.have.property('name', 'henry')
    })
    it('loads config from package.json `bot` attribute', () => {
      expect(bot.settings.getConfig()).to.have.property('alias', 'bb')
    })
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
