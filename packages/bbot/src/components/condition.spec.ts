import 'mocha'
import * as sinon from 'sinon'
import { expect, assert } from 'chai'
import { Expression, Conditions } from './condition'

describe('[condition]', () => {
  describe('Expression', () => {
    describe('.fromString', () => {
      it('convert a string in regex format to regex', () => {
        const exp = new Expression()
        expect(exp.fromString('/test/i')).to.eql(/test/i)
      })
      it('throws when string is not in regex format', () => {
        const exp = new Expression()
        expect(() => exp.fromString('test')).to.throw()
      })
    })
    describe('.escape', () => {
      it('escapes any special regex characters', () => {
        const exp = new Expression()
        expect(exp.escape('.+*?^$[]{}()|/')).to.equal('\\.\\+\\*\\?\\^\\$\\[\\]\\{\\}\\(\\)\\|\\/')
      })
    })
    describe('.fromCondition', () => {
      it('creates regex from condition type, value and config', () => {
        const exp = new Expression()
        expect(exp.fromCondition({ is: 'test' })).to.eql(/^(test)$/i)
      })
      it('creates regex from condition with multiple possible values', () => {
        const exp = new Expression()
        const expected = /^(foo|bar)$/i
        expect(exp.fromCondition({ is: ['foo', 'bar'] })).to.eql(expected)
      })
    })
  })
  describe('Conditions', () => {
    describe('constructor', () => {
      before(() => {
        sinon.spy(Conditions.prototype, 'add')
      })
      afterEach(() => {
        (Conditions.prototype.add as sinon.SinonSpy).resetHistory()
      })
      after(() => {
        (Conditions.prototype.add as sinon.SinonSpy).restore()
      })
      it('given string, adds as given', () => {
        const arg = '/test/'
        new Conditions(arg)
        const add = (Conditions.prototype.add as sinon.SinonSpy)
        sinon.assert.calledWithExactly(add, arg)
      })
      it('given regex, adds as given', () => {
        const arg = /test/
        new Conditions(arg)
        const add = (Conditions.prototype.add as sinon.SinonSpy)
        sinon.assert.calledWithExactly(add, arg)
      })
      it('given condition, adds as given', () => {
        const arg = { starts: 'foo', ends: 'bar' }
        new Conditions(arg)
        const add = (Conditions.prototype.add as sinon.SinonSpy)
        sinon.assert.calledWithExactly(add, arg)
      })
      it('given condition array, adds each as given', () => {
        const arg = [
          { starts: 'foo', ends: 'bar' },
          { starts: 'baz', ends: 'qux' }
        ]
        new Conditions(arg)
        const add = (Conditions.prototype.add as sinon.SinonSpy)
        expect(add.args).to.eql([[arg[0]], [arg[1]]])
      })
      it('given condition collection, adds each with key', () => {
        const arg = {
          'first' : { starts: 'foo', ends: 'bar' },
          'second' : { starts: 'baz', ends: 'qux' }
        }
        new Conditions(arg)
        const add = (Conditions.prototype.add as sinon.SinonSpy)
        expect(add.args).to.eql([
          [arg['first'], 'first'], [arg['second'], 'second']
        ])
      })
    })
    describe('.add', () => {
      it('accepts condition', () => {
        const c = new Conditions()
        c.add({ excludes: '?' }, 'eroteme')
        expect(c.expressions['eroteme']).to.be.instanceof(RegExp)
      })
      it('accepts regex', () => {
        const c = new Conditions()
        c.add(/test/i, 'test')
        expect(c.expressions['test']).to.be.instanceof(RegExp)
      })
      it('accepts string', () => {
        const c = new Conditions()
        c.add('/test/i', 'test')
        expect(c.expressions['test']).to.be.instanceof(RegExp)
      })
    })
    describe('.exec', () => {
      it('collects match objects for each expression result', () => {
        const c = new Conditions()
        c.add(/foo/, 'foo')
        c.add(/bar/, 'bar')
        const test = 'a foo walks into a bar'
        expect(c.exec(test)).to.eql({
          'foo': test.match(/foo/),
          'bar': test.match(/bar/)
        })
      })
      context('type: `is`', () => {
        it('match whole input', () => {
          const c = new Conditions({ a: { is: 'foo' } })
          expect(c.exec('foo')['a']).to.include.members(['foo'])
        })
        it('falsy if not whole input', () => {
          const c = new Conditions({ a: { is: 'foo' } })
          assert.notOk(c.exec('foot')['a'])
        })
      })
      context('type: `starts` w/ `matchWord`', () => {
        it('match first word', () => {
          const c = new Conditions({ a: { starts: 'foo' } })
          expect(c.exec('foo bar')['a']).to.include.members(['foo'])
        })
        it('falsy if not first word', () => {
          const c = new Conditions({ a: { starts: 'foot' } })
          assert.notOk(c.exec('food bar')['a'])
        })
      })
      context('type: `ends` w/ `matchWord`', () => {
        it('match last word', () => {
          const c = new Conditions({ a: { ends: 'bar' } })
          expect(c.exec('foo bar')['a']).to.include.members(['bar'])
        })
        it('falsy if not last word', () => {
          const c = new Conditions({ a: { ends: 'ar' } })
          assert.notOk(c.exec('food bar')['a'])
        })
      })
      context('type: `contains` w/ `matchWord`', () => {
        it('match containing word', () => {
          const c = new Conditions({ a: { contains: 'bar' } })
          expect(c.exec('foo bar baz')['a']).to.include.members(['bar'])
        })
        it('falsy if not containing word', () => {
          const c = new Conditions({ a: { contains: 'ar' } })
          assert.notOk(c.exec('foo bar baz')['a'])
        })
      })
    })
    describe('.matches', () => {
      it('contains match results assigned to keys', () => {
        const c = new Conditions()
        c.add(/foo/, 'foo')
        c.add(/bar/, 'bar')
        c.exec('foo bar')
        expect(c.matches).to.eql({
          foo: /foo/.exec('foo bar'),
          bar: /bar/.exec('foo bar')
        })
      })
      it('assigns matches to index if no key given', () => {
        const c = new Conditions()
        c.add(/foo/)
        c.add(/bar/)
        c.exec('foo bar')
        expect(c.matches).to.eql({
          0: /foo/.exec('foo bar'),
          1: /bar/.exec('foo bar')
        })
      })
      it('combines multiple conditions against same key', () => {
        const c = new Conditions({
          who: { after: 'who', before: '?' },
          verb: { contains: ['goes', 'is'] }
        }, {
          ignorePunctuation: false,
          matchWord: false
        })
        const s = 'who goes there?'
        c.exec(s)
        expect(c.matches).to.eql({
          who: /who (.*)+?\?/.exec(s),
          verb: /(goes|is)/.exec(s)
        })
      })
    })
    describe('.success', () => {
      it('returns true if all match', () => {
        const c = new Conditions()
        c.add(/foo/).add(/bar/)
        c.exec('foo bar')
        expect(c.success).to.equal(true)
      })
      it('returns false if only some', () => {
        const c = new Conditions()
        c.add(/foo/)
        c.add(/bar/)
        c.exec('foo')
        expect(c.success).to.equal(false)
      })
    })
    describe('.match', () => {
      it('returns first match result if only one', () => {
        const c = new Conditions()
        c.add(/foo/, 'foo')
        c.exec('foo')
        expect(c.match).to.eql(/foo/.exec('foo'))
      })
      it('returns cumulative success if multiple', () => {
        const c = new Conditions()
        c.add(/foo/, 'foo')
        c.add(/bar/, 'bar')
        c.exec('foo bar')
        expect(c.match).to.equal(true)
      })
    })
    describe('.captured', () => {
      it('returns capture groups if only one condition without key', () => {
        const c = new Conditions()
        c.add({ range: '1-9' })
        c.exec('Test: name Testing, number 1')
        expect(c.captured).to.equal('1')
      })
      it('returns collection of condition capture groups content', () => {
        const c = new Conditions()
        c.add({ range: '1-9' }, 'num')
        c.add({ after: 'name', before: ',' }, 'name')
        c.exec('Test: name Testing, number 1')
        expect(c.captured).to.eql({ num: '1', name: 'Testing' })
      })
      it('returns keys with undefined value where nothing captured', () => {
        const c = new Conditions()
        c.add({ range: '1-9' }, 'num')
        c.add({ after: 'name', before: ',' }, 'name')
        c.exec('Test: name Testing, no number')
        expect(c.captured).to.eql({ num: undefined, name: 'Testing' })
      })
      it('returns indexed object result if no keys', () => {
        const c = new Conditions()
        c.add({ range: '1-9' }, 'num')
        c.add({ after: 'name', before: ',' })
        c.exec('Test: name Testing, no number')
        expect(c.captured).to.eql({ num: undefined, 1: 'Testing' })
      })
      it('combines multiple conditions for capture against key', () => {
        const c = new Conditions()
        c.add({ after: 'door', range: '1-3' }, 'door')
        c.exec('Door number 3')
        expect(c.captured).to.eql({ door: '3' })
      })
      it('captures prefix/suffix without other conditions against key', () => {
        const c = new Conditions()
        c.add({ starts: 'foo' }, 'start')
        c.add({ ends: 'baz' }, 'end')
        c.exec('foo bar baz')
        expect(c.captured).to.eql({ start: 'foo', end: 'baz' })
      })
    })
    describe('.clear', () => {
      it('clears results but keeps expressions', () => {
        const c = new Conditions()
        c.add(/test/)
        c.exec('test')
        c.clear()
        expect([c.matches, c.captures]).to.eql([{},{}])
        expect(c.expressions).to.eql({ '0': /test/ })
      })
    })
    describe('.clearAll', () => {
      it('clears results and expressions', () => {
        const c = new Conditions()
        c.add(/test/)
        c.clearAll()
        expect(c.expressions).to.eql({})
      })
    })
  })
})
