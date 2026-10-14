import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectTransition, animationPhases } from '../lib/network-animation.ts'
import { trainLinear } from '../lib/simulation.ts'
import { catalogs, supportedLanguages } from '../lib/translations.ts'

test('animation reproduces the actual first gradient update', () => {
  const [before, after] = trainLinear(.1, 1)
  const transition = inspectTransition(after, before, .1)
  assert.equal(transition.gradientUpdate, true)
  assert.ok(Math.abs(transition.after.w - .32) < 1e-12)
  assert.ok(Math.abs(transition.after.b - .06) < 1e-12)
  assert.ok(Math.abs(transition.after.prediction - .7) < 1e-12)
})

test('initialization does not invent a parameter update', () => {
  const state = trainLinear(.1, 0)[0]
  const transition = inspectTransition(state)
  assert.equal(transition.hasUpdate, false)
  assert.equal(transition.deltaW, 0)
  assert.equal(transition.deltaB, 0)
})

test('custom Python updates are displayed as observed changes, not invented gradient descent', () => {
  const [before, after] = trainLinear(.1, 1)
  assert.equal(inspectTransition(after, before, null).gradientUpdate, false)
  const custom = { ...after, w: 9 }
  assert.equal(inspectTransition(custom, before, .1).gradientUpdate, false)
  assert.equal(inspectTransition(custom, before, .1).after.w, 9)
})

test('animation phases are translated in all languages', () => {
  for (const language of supportedLanguages) for (const phase of animationPhases) assert.ok(catalogs[language][phase], `${language}: ${phase}`)
})
