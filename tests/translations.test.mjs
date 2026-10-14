import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { catalogs, supportedLanguages, translate } from '../lib/translations.ts'

test('all seven languages contain the same complete message catalog', () => {
  const keys = Object.keys(catalogs.fr).sort()
  assert.ok(keys.length >= 138)
  for (const language of supportedLanguages) {
    assert.deepEqual(Object.keys(catalogs[language]).sort(), keys)
    for (const key of keys) {
      assert.ok(catalogs[language][key].trim(), `${language}: ${key}`)
      assert.ok(!catalogs[language][key].includes('\uFFFD'), `${language}: invalid character`)
    }
  }
})

test('static translated messages in the page are covered by the catalog', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 't') {
      const arg = node.arguments[0]
      const strings = ts.isStringLiteral(arg) ? [arg] : ts.isConditionalExpression(arg) ? [arg.whenTrue, arg.whenFalse].filter(ts.isStringLiteral) : []
      for (const value of strings) assert.ok(value.text.trim() in catalogs.fr, value.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert.ok(!source.includes('MutationObserver'))
  assert.ok(!source.includes('createTreeWalker'))
})

test('translation is exact and preserves surrounding whitespace and Python code', () => {
  assert.equal(translate(' Prédiction ', 'en'), ' Prediction ')
  assert.equal(translate('prediction = w * x + b\nprint(loss)', 'ar'), 'prediction = w * x + b\nprint(loss)')
  assert.equal(translate('loss: 0.18', 'es'), 'loss: 0.18')
})

test('changing language does not reuse previously translated text', () => {
  const source = 'Comprendre comment les modèles apprennent.'
  for (const language of ['ar', 'en', 'es', 'hi', 'tr', 'pt', 'fr', 'en', 'ar', 'fr']) {
    assert.equal(translate(source, language), catalogs[language][source])
  }
})

test('quiz explanations and server errors are localized in every language', () => {
  const keys = ['La rétropropagation remonte la chaîne pour obtenir les gradients, puis la descente met à jour les paramètres.', 'Trop d’exécutions. Réessaie dans une minute.']
  for (const language of supportedLanguages.filter(language => language !== 'fr')) {
    for (const key of keys) assert.notEqual(translate(key, language), key)
  }
})
