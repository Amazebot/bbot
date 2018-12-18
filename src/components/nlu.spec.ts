import 'mocha'
import * as sinon from 'sinon'
import { expect, assert } from 'chai'
import * as bot from '..'

let results: bot.nlu.Results

describe('[nlu]', () => {
  describe('Result', () => {
    beforeEach(() => {
      results = {
        intent: bot.nlu.result().add({ id: 'test', score: .9 }, { id: 'unit', score: .5 }),
        entities: bot.nlu.result().add({ id: 'foo' }, { id: 'bar' }),
        sentiment: bot.nlu.result().add({ score: .5 }),
        tone: bot.nlu.result().add(
          { id: 'questioning', score: .3 },
          { id: 'tentative', score: .6 }
        ),
        act: bot.nlu.result().add(
          { id: 'assert', name: 'A test assertion', score: 1 },
          { id: 'statement', name: 'Another word for assertion' }
        ),
        language: bot.nlu.result().add({ id: 'en', name: 'english' }),
        phrases: bot.nlu.result()
      }
    })
    describe('.indexIncludes', () => {
      it('returns falsy when not in results', () => {
        assert.isNotOk(results.phrases!.indexIncludes(0, { id: 'test' }))
      })
      it('returns falsy if not matching id at index', () => {
        assert.isNotOk(results.intent!.indexIncludes(0, { id: 'unit' }))
      })
      it('returns falsy if not matching both id and name at index', () => {
        assert.isNotOk(results.act!.indexIncludes(0, { id: 'assert', name: 'nope' }))
      })
      it('returns falsy if not matching score at index', () => {
        assert.isNotOk(results.sentiment!.indexIncludes(0, { score: 1 }))
      })
      it('returns falsy if matching score, but not matching id at index', () => {
        assert.isNotOk(results.intent!.indexIncludes(1, { score: .5, id: 'nope' }))
      })
      it('returns element if matching id at index', () => {
        expect(results.intent!.indexIncludes(0, { id: 'test' })).to.eql(results.intent![0])
      })
      it('returns element if matching score at index', () => {
        expect(results.intent!.indexIncludes(1, { score: .5 })).to.eql(results.intent![1])
      })
      it('returns element if matching id but not score at index', () => {
        expect(results.intent!.indexIncludes(0, { id: 'test', score: 0 })).to.eql(results.intent![0])
      })
      it('returns element if matching name but not score at index', () => {
        expect(results.language!.indexIncludes(0, { name: 'english', score: 0 })).to.eql(results.language![0])
      })
    })
    describe('.sortByScore', () => {
      it('sorts results by score, descending', () => {
        results.tone!.sortByScore()
        expect(results.tone![0].score).to.be.gt(results.tone![1].score!)
      })
      it('sorts items without score first', () => {
        results.act!.sortByScore()
        expect(results.act![0].id).to.equal('statement')
      })
      it('leaves items without score in order', () => {
        results.entities!.sortByScore()
        expect(results.entities).to.eql([{ id: 'foo' }, { id: 'bar' }])
      })
    })
    describe('.match', () => {
      // NB: Results are always sorted by score, make assertions in order
      it('`in` operator returns all matching elements', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        ]
        result.push(...results)
        expect(result.match({ id: 'foo', operator: 'in' })).to.eql([results[2], results[0]])
      })
      it('`is` operator matches if only a single element matches', () => {
        const result = bot.nlu.result()
        result.push({ id: 'foo', score: .1 })
        expect(result.match({ id: 'foo', operator: 'is' })).to.eql([{ id: 'foo', score: .1 }])
      })
      it('`is` operator fails if element matches but other elements exist', () => {
        const result = bot.nlu.result()
        result.push({ id: 'foo', score: .1 }, { id: 'foo', score: .2 })
        assert.notOk(result.match({ id: 'foo', operator: 'is' }))
      })
      it('`max` operator returns matching item it has largest score', () => {
        const result = bot.nlu.result()
        result.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        expect(result.match({ id: 'foo', operator: 'max' })).to.eql([{ id: 'foo', score: .3 }])
      })
      it('`max` operator returns false if largest item does not match', () => {
        const result = bot.nlu.result()
        result.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        assert.notOk(result.match({ id: 'bar', operator: 'max' }))
      })
      it('`max` operator returns item without score if matching', () => {
        const result = bot.nlu.result()
        result.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'baz' }
        )
        expect(result.match({ id: 'baz', operator: 'max' })).to.eql([{ id: 'baz' }])
      })
      it('`min` operator returns matching item it has lowest score', () => {
        const result = bot.nlu.result()
        result.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        expect(result.match({ id: 'foo', operator: 'min' })).to.eql([{ id: 'foo', score: .1 }])
      })
      it('`min` operator returns false if lowest item does not match', () => {
        const result = bot.nlu.result()
        result.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        assert.notOk(result.match({ id: 'bar', operator: 'min' }))
      })
      it('`eq` operator returns matching items if score exact match', () => {
        const result = bot.nlu.result()
        result.push({ id: 'foo', score: -0.1 }, { id: 'bar', score: 0 })
        expect(result.match({ score: 0, operator: 'eq' })).to.eql([{ id: 'bar', score: 0 }])
      })
      it('`gte` operator returns matching items if score higher or equal', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: -1 },
          { id: 'foo', score: 0 },
          { id: 'foo', score: 1 },
          { id: 'bar', score: 2 }
        ]
        result.push(...results)
        expect(result.match({ id: 'foo', score: 0, operator: 'gte' })).to.eql([
          { id: 'foo', score: 1 },
          { id: 'foo', score: 0 }
        ])
      })
      it('`gte` operator with only score returns all higher or equal', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        result.push(...results)
        expect(result.match({ score: .2, operator: 'gte' })).to.eql([
          { id: 'bar', score: .4 },
          { id: 'foo', score: .3 },
          { id: 'foo', score: .2 }
        ])
      })
      it('`gt` operator returns matching items if score higher', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        result.push(...results)
        expect(result.match({ id: 'foo', score: .2, operator: 'gt' })).to.eql([
          { id: 'foo', score: .3 }
        ])
      })
      it('`gt` operator with only score returns all higher', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        result.push(...results)
        expect(result.match({ score: .2, operator: 'gt' })).to.eql([
          { id: 'bar', score: .4 },
          { id: 'foo', score: .3 }
        ])
      })
      it('`lte` operator returns matching items if score less or equal', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'bar', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        result.push(...results)
        expect(result.match({ id: 'foo', score: .2, operator: 'lte' })).to.eql([
          { id: 'foo', score: .2 }
        ])
      })
      it('`lte` operator with only score returns all less or equal', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        result.push(...results)
        expect(result.match({ score: .2, operator: 'lte' })).to.eql([
          { id: 'foo', score: .2 },
          { id: 'foo', score: .1 }
        ])
      })
      it('`lt` operator returns matching items if score less', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'bar', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        result.push(...results)
        expect(result.match({ id: 'foo', score: .3, operator: 'lt' })).to.eql([
          { id: 'foo', score: .2 }
        ])
      })
      it('`lt` operator with only score returns all less', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'bar', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        result.push(...results)
        expect(result.match({ score: .2, operator: 'lt' })).to.eql([
          { id: 'bar', score: .1 }
        ])
      })
      it('matches as `in` if not given score', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        ]
        result.push(...results)
        expect(result.match({ id: 'foo' })).to.eql([results[2], results[0]])
      })
      it('matches as `gte` if given score without operator', () => {
        const result = bot.nlu.result()
        const results = [
          { id: 'foo', score: -.1 },
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 }
        ]
        result.push(...results)
        expect(result.match({ score: 0 })).to.eql([results[2], results[1]])
      })
    })
    describe('.add', () => {
      it('pushes set of argument results into collection', () => {
        const result = bot.nlu.result()
        result.add({ id: 'foo', score: .1 }, { id: 'bar', score: .2 })
        expect(Array.from(result)).to.eql([
          { id: 'foo', score: .1 }, { id: 'bar', score: .2 }
        ])
      })
    })
  })
  describe('NLU', () => {
    describe('.addResult', () => {
      it('adds result set args to new results attribute at key', () => {
        const nlu = bot.nlu.create().addResult('intent', { id: 'foo' }, { id: 'bar' })
        expect(nlu.results.intent).to.be.instanceof(bot.nlu.Result)
        expect(Array.from(nlu.results.intent!)).to.eql([{ id: 'foo' }, { id: 'bar' }])
      })
      it('adds to result set if already exists', () => {
        const nlu = bot.nlu.create().addResult('act', { id: 'foo' }, { id: 'bar' })
        nlu.addResult('act', { id: 'baz' })
        expect(Array.from(nlu.results.act!)).to.eql([{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }])
      })
    })
    describe('.matchCriteria', () => {
      it('returns matches from match call on NLU results', () => {
        const nlu = bot.nlu.create().addResult('act', { id: 'foo' }, { id: 'bar' })
        const match = sinon.spy(nlu.results.act.match)
        const result = nlu.matchCriteria('act', { id: 'foo' })
        expect(result).to.eql(match.returnValues[0])
      })
    })
    describe('.matchAllCriteria', () => {
      it('returns matches from match calls on set of NLU results', () => {
        const nlu = bot.nlu.create().addResults({
          act: [{ id: 'foo' }, { id: 'bar' }],
          intent: [{ id: 'baz' }, { id: 'qux' }]
        })
        const matchAct = sinon.spy(nlu.results.act.match)
        const matchIntent = sinon.spy(nlu.results.intent.match)
        const result = nlu.matchAllCriteria({
          act: { id: 'foo' },
          intent: { id: 'qux' }
        })
        expect(result).to.eql({
          act: matchAct.returnValues[0],
          intent: matchIntent.returnValues[0]
        })
      })
    })
    describe('.printResults', () => {
      it('formats NLU results for readability', () => {
        const nlu = bot.nlu.create().addResults({
          sentiment: [{ id: 'fooS', score: -.1234 }],
          act: [{ id: 'fooA' }, { id: 'bar' }],
          phrases: []
        })
        expect(nlu.printResults()).to.equal('sentiment (fooS -0.12), act (fooA, bar)')
      })
    })
  })
})
