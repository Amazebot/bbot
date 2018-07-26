import 'mocha'
import sinon from 'sinon'
import { expect, assert } from 'chai'
import {
  NaturalLanguageResult,
  NaturalLanguageResults,
  NLU
} from './nlu'

let results: NaturalLanguageResults

describe('nlu', () => {
  describe('NaturalLanguageResult', () => {
    beforeEach(() => {
      results = {
        intent: new NaturalLanguageResult().add({ id: 'test', score: .9 }, { id: 'unit', score: .5 }),
        entities: new NaturalLanguageResult().add({ id: 'foo' }, { id: 'bar' }),
        sentiment: new NaturalLanguageResult().add({ score: .5 }),
        tone: new NaturalLanguageResult().add(
          { id: 'questioning', score: .3 },
          { id: 'tentative', score: .6 }
        ),
        act: new NaturalLanguageResult().add(
          { id: 'assert', name: 'A test assertion', score: 1 },
          { id: 'statement', name: 'Another word for assertion' }
        ),
        language: new NaturalLanguageResult().add({ id: 'en', name: 'english' }),
        phrases: new NaturalLanguageResult()
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
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        ]
        nlur.push(...results)
        expect(nlur.match({ id: 'foo', operator: 'in' })).to.eql([results[2], results[0]])
      })
      it('`is` operator matches if only a single element matches', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push({ id: 'foo', score: .1 })
        expect(nlur.match({ id: 'foo', operator: 'is' })).to.eql([{ id: 'foo', score: .1 }])
      })
      it('`is` operator fails if element matches but other elements exist', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push({ id: 'foo', score: .1 }, { id: 'foo', score: .2 })
        assert.notOk(nlur.match({ id: 'foo', operator: 'is' }))
      })
      it('`max` operator returns matching item it has largest score', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        expect(nlur.match({ id: 'foo', operator: 'max' })).to.eql([{ id: 'foo', score: .3 }])
      })
      it('`max` operator returns false if largest item does not match', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        assert.notOk(nlur.match({ id: 'bar', operator: 'max' }))
      })
      it('`max` operator returns item without score if matching', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'baz' }
        )
        expect(nlur.match({ id: 'baz', operator: 'max' })).to.eql([{ id: 'baz' }])
      })
      it('`min` operator returns matching item it has lowest score', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        expect(nlur.match({ id: 'foo', operator: 'min' })).to.eql([{ id: 'foo', score: .1 }])
      })
      it('`min` operator returns false if lowest item does not match', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push(
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        )
        assert.notOk(nlur.match({ id: 'bar', operator: 'min' }))
      })
      it('`eq` operator returns matching items if score exact match', () => {
        const nlur = new NaturalLanguageResult()
        nlur.push({ id: 'foo', score: -0.1 }, { id: 'bar', score: 0 })
        expect(nlur.match({ score: 0, operator: 'eq' })).to.eql([{ id: 'bar', score: 0 }])
      })
      it('`gte` operator returns matching items if score higher or equal', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: -1 },
          { id: 'foo', score: 0 },
          { id: 'foo', score: 1 },
          { id: 'bar', score: 2 }
        ]
        nlur.push(...results)
        expect(nlur.match({ id: 'foo', score: 0, operator: 'gte' })).to.eql([
          { id: 'foo', score: 1 },
          { id: 'foo', score: 0 }
        ])
      })
      it('`gte` operator with only score returns all higher or equal', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        nlur.push(...results)
        expect(nlur.match({ score: .2, operator: 'gte' })).to.eql([
          { id: 'bar', score: .4 },
          { id: 'foo', score: .3 },
          { id: 'foo', score: .2 }
        ])
      })
      it('`gt` operator returns matching items if score higher', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        nlur.push(...results)
        expect(nlur.match({ id: 'foo', score: .2, operator: 'gt' })).to.eql([
          { id: 'foo', score: .3 }
        ])
      })
      it('`gt` operator with only score returns all higher', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        nlur.push(...results)
        expect(nlur.match({ score: .2, operator: 'gt' })).to.eql([
          { id: 'bar', score: .4 },
          { id: 'foo', score: .3 }
        ])
      })
      it('`lte` operator returns matching items if score less or equal', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'bar', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        nlur.push(...results)
        expect(nlur.match({ id: 'foo', score: .2, operator: 'lte' })).to.eql([
          { id: 'foo', score: .2 }
        ])
      })
      it('`lte` operator with only score returns all less or equal', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        nlur.push(...results)
        expect(nlur.match({ score: .2, operator: 'lte' })).to.eql([
          { id: 'foo', score: .2 },
          { id: 'foo', score: .1 }
        ])
      })
      it('`lt` operator returns matching items if score less', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'bar', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        nlur.push(...results)
        expect(nlur.match({ id: 'foo', score: .3, operator: 'lt' })).to.eql([
          { id: 'foo', score: .2 }
        ])
      })
      it('`lt` operator with only score returns all less', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'bar', score: .1 },
          { id: 'foo', score: .2 },
          { id: 'foo', score: .3 },
          { id: 'bar', score: .4 }
        ]
        nlur.push(...results)
        expect(nlur.match({ score: .2, operator: 'lt' })).to.eql([
          { id: 'bar', score: .1 }
        ])
      })
      it('matches as `in` if not given score', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 },
          { id: 'foo', score: .3 }
        ]
        nlur.push(...results)
        expect(nlur.match({ id: 'foo' })).to.eql([results[2], results[0]])
      })
      it('matches as `gte` if given score without operator', () => {
        const nlur = new NaturalLanguageResult()
        const results = [
          { id: 'foo', score: -.1 },
          { id: 'foo', score: .1 },
          { id: 'bar', score: .2 }
        ]
        nlur.push(...results)
        expect(nlur.match({ score: 0 })).to.eql([results[2], results[1]])
      })
    })
    describe('.add', () => {
      it('pushes set of argument results into collection', () => {
        const nlur = new NaturalLanguageResult()
        nlur.add({ id: 'foo', score: .1 }, { id: 'bar', score: .2 })
        expect(Array.from(nlur)).to.eql([
          { id: 'foo', score: .1 }, { id: 'bar', score: .2 }
        ])
      })
    })
  })
  describe('NLU', () => {
    describe('.addResult', () => {
      it('adds result set args to new results attribute at key', () => {
        const nlu = new NLU().addResult('intent', { id: 'foo' }, { id: 'bar' })
        expect(nlu.results.intent).to.be.instanceof(NaturalLanguageResult)
        expect(Array.from(nlu.results.intent!)).to.eql([{ id: 'foo' }, { id: 'bar' }])
      })
      it('adds to result set if already exists', () => {
        const nlu = new NLU().addResult('act', { id: 'foo' }, { id: 'bar' })
        nlu.addResult('act', { id: 'baz' })
        expect(Array.from(nlu.results.act!)).to.eql([{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }])
      })
    })
    describe('.matchCriteria', () => {
      it('returns matches from match call on NLU results', () => {
        const nlu = new NLU().addResult('act', { id: 'foo' }, { id: 'bar' })
        const match = sinon.spy(nlu.results.act!, 'match')
        const result = nlu.matchCriteria('act', { id: 'foo' })
        expect(result).to.eql(match.returnValues[0])
      })
    })
    describe('.matchAllCriteria', () => {
      it('returns matches from match calls on set of NLU results', () => {
        const nlu = new NLU().addResults({
          act: [{ id: 'foo' }, { id: 'bar' }],
          intent: [{ id: 'baz' }, { id: 'qux' }]
        })
        const matchAct = sinon.spy(nlu.results.act!, 'match')
        const matchIntent = sinon.spy(nlu.results.intent!, 'match')
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
  })
})
