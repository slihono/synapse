import test from 'node:test'
import assert from 'node:assert/strict'
import { trainLinear, manualNetwork, parseParameters, format, readCodeParameter, trainingTrend, updateCodeParameter } from '../lib/simulation.ts'
import { readHistory } from '../lib/python-report.ts'
import { interpolate } from '../lib/i18n.ts'

test('linear update agrees with the analytical gradient and converges', () => {
  const history = trainLinear(0.1, 20)
  assert.equal(history.length, 21)
  assert.ok(Math.abs(history[1].prediction - 0.7) < 1e-12)
  assert.ok(history.at(-1).loss < history[0].loss)
})

test('all manual exercise variants improve after one update', () => {
  for (let version = 0; version < 3; version++) {
    const result = manualNetwork(version)
    assert.ok(result.newLoss < result.loss)
    assert.ok(Math.abs(result.updated.w2 - (result.w2 - result.lr * result.dw2)) < 1e-12)
  }
})

test('localized questions bind placeholders by name even when their order changes', () => {
  assert.equal(interpolate('w2 = {b}; gradient = {a}', { a: '-0.1966', b: '0.8' }), 'w2 = 0.8; gradient = -0.1966')
})

test('parameter parsing accepts exponent notation without matching partial expressions', () => {
  assert.equal(parseParameters('learning_rate = 1e-2 # small step').learningRate, 0.01)
  assert.equal(parseParameters('x = -2.5e+1').x, -25)
  assert.equal(parseParameters('x = 2 + 4').x, 2)
})

test('malformed Python history cannot reach the charts', () => {
  const valid = trainLinear(0.1, 1)
  assert.deepEqual(readHistory([null, {}, { step: 0 }, { ...valid[0], loss: Infinity }]), [])
  const result = readHistory([{ ...valid[0], step: 50 }, { ...valid[1], step: 51 }])
  assert.deepEqual(result.map(state => state.step), [0, 1])
})

test('parameter controls replace the complete literal and preserve comments', () => {
  assert.equal(updateCodeParameter('learning_rate = 1e-2 # rate', 'learning_rate', .2), 'learning_rate = 0.2 # rate')
  assert.equal(updateCodeParameter('# learning_rate = .1\nlearning_rate = .1', 'learning_rate', .2), '# learning_rate = .1\nlearning_rate = 0.2')
  assert.equal(updateCodeParameter('learning_rate = 2 / 10', 'learning_rate', .2), 'learning_rate = 2 / 10')
})

test('divergent simulation never sends nonfinite values to charts', () => {
  const result = trainLinear(0.5, 100, 0.2, 0, 1e20)
  assert.ok(result.length < 101)
  assert.ok(result.every(state => Object.values(state).every(Number.isFinite)))
})

test('constant loss and a single snapshot are not reported as an increase', () => {
  assert.equal(trainingTrend(trainLinear(0, 10)), 'unchanged')
  assert.equal(trainingTrend(trainLinear(.1, 0)), 'unchanged')
  assert.equal(trainingTrend(trainLinear(.1, 10)), 'improving')
  assert.equal(trainingTrend(trainLinear(.5, 10)), 'increasing')
})

test('numeric controls distinguish literal parameters from expressions or absent variables', () => {
  assert.equal(readCodeParameter('learning_rate = 2 / 10', 'learning_rate'), null)
  assert.equal(readCodeParameter('print(4)', 'learning_rate'), null)
  assert.equal(readCodeParameter('learning_rate = 2e-1', 'learning_rate'), .2)
})

test('number formatting does not round displayed results', () => {
  const value = manualNetwork().h
  assert.equal(format(value), String(value))
  assert.equal(format(1e-15), '1e-15')
})
