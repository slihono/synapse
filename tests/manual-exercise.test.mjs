import test from 'node:test'
import assert from 'node:assert/strict'
import { manualSteps, checkManualAnswer } from '../lib/manual-exercise.ts'
import { manualNetwork, starterCode, trainLinear } from '../lib/simulation.ts'
import { localizePythonComments } from '../lib/python-comments.ts'
import { catalogs, supportedLanguages } from '../lib/translations.ts'

test('forward calculations must precede loss and all gradients and updates are separate questions', () => {
  const { steps } = manualSteps(manualNetwork())
  assert.equal(steps.length, 18)
  assert.deepEqual(steps.slice(0, 5).map(step => step.symbol), ['z₁', 'h', 'ŷ', 'ε', 'L'])
  assert.deepEqual(steps.map(step => step.stage), [0,0,0,1,1,2,2,2,2,2,2,2,3,3,3,3,4,4])
  assert.ok(Math.abs(steps[16].value - .7775940526877725) < 1e-12)
  assert.ok(Math.abs(steps[17].value - .02473220269992466) < 1e-12)
})

test('h and y-hat coincide only for the relevant starting parameters', () => {
  const defaultModel = manualNetwork(0)
  assert.equal(defaultModel.h, defaultModel.prediction)
  const otherModel = manualNetwork(1)
  assert.notEqual(otherModel.h, otherModel.prediction)
  assert.equal(otherModel.prediction, otherModel.w2 * otherModel.h + otherModel.b2)
})

test('answers accept program values, decimal commas, and calculator precision', () => {
  for (let variant = 0; variant < 3; variant++) {
    for (const step of manualSteps(manualNetwork(variant)).steps) {
      assert.equal(checkManualAnswer(String(step.value), step.value), true)
      assert.equal(checkManualAnswer(step.value.toFixed(10), step.value), true)
      assert.equal(checkManualAnswer(step.value.toFixed(10).replace('.', ','), step.value), true)
      assert.equal(checkManualAnswer(String(step.value + .1), step.value), false)
    }
  }
  assert.equal(checkManualAnswer('', 0), false)
  assert.equal(checkManualAnswer('0/0', 0), false)
})

test('partial derivative of loss agrees with numerical differentiation, not loss divided by weight', () => {
  const n = manualNetwork()
  const loss = w => .5 * (w * n.h + n.b2 - n.target) ** 2
  const epsilon = 1e-6
  const derivative = (loss(n.w2 + epsilon) - loss(n.w2 - epsilon)) / (2 * epsilon)
  assert.ok(Math.abs(derivative - n.dw2) < 1e-9)
  assert.notEqual(n.dw2, n.loss / n.w2)
})

test('default Python result approaches one without being exactly one', () => {
  const result = trainLinear(.1, 20).at(-1)
  assert.ok(result.prediction < 1)
  assert.ok(result.prediction > .99999)
})

test('generated Python comments follow the language without changing code or custom comments', () => {
  const computational = code => code.split('\n').filter(line => !line.trim().startsWith('#')).join('\n')
  let code = starterCode + '\n# Custom comment\nw = 0.3'
  for (const language of supportedLanguages) {
    code = localizePythonComments(code, language)
    assert.equal(computational(code), computational(starterCode + '\n# Custom comment\nw = 0.3'))
    assert.ok(code.endsWith('# Custom comment\nw = 0.3'))
  }
  assert.ok(localizePythonComments(starterCode, 'en').startsWith('# Separate linear model'))
})

test('every teaching explanation is available in all seven languages', () => {
  for (const step of manualSteps(manualNetwork()).steps) {
    for (const language of supportedLanguages) assert.ok(catalogs[language][step.explanation], `${language}: ${step.explanation}`)
  }
})

test('sigmoid uses Euler exponent notation and the error has a separate symbol', () => {
  const { steps } = manualSteps(manualNetwork())
  assert.equal(steps[1].formula, 'h = sigmoid(z₁) = 1 / (1 + e^(−1))')
  assert.equal(steps.some(step => step.symbol === 'z₁′' || step.symbol === 'h′'), false)
  assert.equal(steps[3].symbol, 'ε')
  assert.ok(steps[4].formula.includes('ε²'))
})

test('answers accept correct rounding at each entered precision from one to eight decimals', () => {
  for (let variant = 0; variant < 3; variant++) {
    for (const step of manualSteps(manualNetwork(variant)).steps) {
      for (let decimals = 1; decimals <= 8; decimals++) {
        const rounded = step.value.toFixed(decimals)
        assert.equal(checkManualAnswer(rounded, step.value), true)
        assert.equal(checkManualAnswer(rounded.replace('.', ','), step.value), true)
      }
    }
  }
  assert.equal(checkManualAnswer('0.7311', manualNetwork().h), true)
  assert.equal(checkManualAnswer('0.8', manualNetwork().h), false)
  assert.equal(checkManualAnswer('0.70', manualNetwork().h), false)
  assert.equal(checkManualAnswer('1', manualNetwork().h), false)
  assert.equal(checkManualAnswer('-0.3', manualNetwork().h - 1), true)
  assert.equal(checkManualAnswer('Infinity', 1), false)
})

test('formula inputs retain every digit of the computed values', () => {
  const n = manualNetwork()
  const { steps } = manualSteps(n)
  assert.ok(steps[2].formula.includes(String(n.h)))
  assert.ok(steps[6].formula.includes(String(n.prediction - n.target)))
  assert.ok(steps[14].formula.includes(String(n.dw2)))
})

test('negative answers accept calculator and formula minus signs', () => {
  const error = manualNetwork().prediction - manualNetwork().target
  for (const minus of ['-', '−', '﹣', '－']) {
    assert.equal(checkManualAnswer(`${minus}0.2689414213699951`, error), true)
    for (let decimals = 1; decimals <= 8; decimals++) {
      const rounded = error.toFixed(decimals).replace('-', minus)
      assert.equal(checkManualAnswer(rounded, error), true)
      assert.equal(checkManualAnswer(rounded.replace('.', ','), error), true)
    }
  }
  assert.equal(checkManualAnswer('0.2689', error), false)
  assert.equal(checkManualAnswer('−0.2', error), false)
  assert.equal(checkManualAnswer('− 0.2689', error), true)
  assert.equal(checkManualAnswer('−\u00a00,2689', error), true)
  assert.equal(checkManualAnswer('0.26 89', error), false)
})
