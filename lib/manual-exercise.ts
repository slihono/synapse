import type { ManualNetwork } from './simulation'

export function manualSteps(n: ManualNetwork) {
  const error = n.prediction - n.target
  const dh = error * n.w2
  const dz = dh * n.h * (1 - n.h)
  const newZ = n.updated.w1 * n.x + n.updated.b1
  const newH = 1 / (1 + Math.exp(-newZ))
  const f = (v: number) => String(v)
  const step = (stage: number, symbol: string, value: number, formula: string, explanation: string) => ({ stage, symbol, value, formula, explanation })
  return { network: n, steps: [
    step(0, 'z₁', n.z1, `z₁ = w₁ × x + b₁ = ${f(n.w1)} × ${f(n.x)} + ${f(n.b1)}`, "w₁ et w₂ sont des poids indépendants, donnés au départ."),
    step(0, 'h', n.h, `h = sigmoid(z₁) = 1 / (1 + e^(−${f(n.z1)}))`, "h = sigmoid(z₁) est la sortie cachée. exp(a) signifie eᵃ."),
    step(0, 'ŷ', n.prediction, `ŷ = w₂ × h + b₂ = ${f(n.w2)} × ${f(n.h)} + ${f(n.b2)}`, "h est la sortie cachée ; ŷ (y-hat) est la prédiction finale. Ici, h = ŷ seulement parce que w₂ = 1 et b₂ = 0."),
    step(1, 'ε', error, `ε = ŷ − y = ${f(n.prediction)} − ${f(n.target)}`, "y = cible ; ŷ = prédiction ; ε = ŷ − y."),
    step(1, 'L', n.loss, `L = ½ × ε² = ½ × (${f(error)})²`, "L = ½ε² mesure l’erreur au carré."),
    step(2, '∂L/∂ŷ', error, `∂L/∂ŷ = ½ × 2(ŷ − y) × 1 = ${f(n.prediction)} − ${f(n.target)}`, "∂L/∂ŷ est une dérivée partielle, pas une division. Elle mesure la variation de L quand ŷ change. La dérivée de ½(ŷ − y)² est ŷ − y : ½ × 2 = 1."),
    step(2, '∂L/∂w₂', n.dw2, `∂L/∂w₂ = (∂L/∂ŷ) × (∂ŷ/∂w₂) = ${f(error)} × ${f(n.h)}`, "∂L/∂w₂ est le gradient du poids, pas L/w₂. Comme ŷ = w₂h + b₂, ∂ŷ/∂w₂ = h. La règle de chaîne multiplie ces dérivées."),
    step(2, '∂L/∂b₂', n.db2, `∂L/∂b₂ = (∂L/∂ŷ) × 1 = ${f(error)} × 1`, "∂ŷ/∂b₂ = 1 → ∂L/∂b₂ = ∂L/∂ŷ."),
    step(2, '∂L/∂h', dh, `∂L/∂h = (∂L/∂ŷ) × w₂ = ${f(error)} × ${f(n.w2)}`, "On remonte vers la sortie cachée h."),
    step(2, '∂L/∂z₁', dz, `∂L/∂z₁ = (∂L/∂h) × h(1 − h) = ${f(dh)} × ${f(n.h)} × (1 − ${f(n.h)})`, "sigmoid′(z₁) = h(1 − h)"),
    step(2, '∂L/∂w₁', n.dw1, `∂L/∂w₁ = (∂L/∂z₁) × x = ${f(dz)} × ${f(n.x)}`, "∂z₁/∂w₁ = x"),
    step(2, '∂L/∂b₁', n.db1, `∂L/∂b₁ = (∂L/∂z₁) × 1 = ${f(dz)} × 1`, "∂z₁/∂b₁ = 1"),
    step(3, 'w₁′', n.updated.w1, `w₁′ = w₁ − η × ∂L/∂w₁ = ${f(n.w1)} − ${f(n.lr)} × (${f(n.dw1)})`, "Tous les gradients sont calculés avant les mises à jour. Nouveau = ancien − η × gradient."),
    step(3, 'b₁′', n.updated.b1, `b₁′ = ${f(n.b1)} − ${f(n.lr)} × (${f(n.db1)})`, "b₁′ = b₁ − η × ∂L/∂b₁"),
    step(3, 'w₂′', n.updated.w2, `w₂′ = w₂ − η × ∂L/∂w₂ = ${f(n.w2)} − ${f(n.lr)} × (${f(n.dw2)})`, "Un gradient négatif augmente le poids : on soustrait un nombre négatif."),
    step(3, 'b₂′', n.updated.b2, `b₂′ = ${f(n.b2)} − ${f(n.lr)} × (${f(n.db2)})`, "b₂′ = b₂ − η × ∂L/∂b₂"),
    step(4, 'ŷ′', n.newPrediction, `ŷ′ = w₂′ × h′ + b₂′ = ${f(n.updated.w2)} × ${f(newH)} + ${f(n.updated.b2)}`, "Une mise à jour rapproche ŷ de y ; elle ne donne pas automatiquement 1."),
    step(4, 'L′', n.newLoss, `L′ = ½ × (ŷ′ − y)² = ½ × (${f(n.newPrediction)} − ${f(n.target)})²`, "Compare L′ à L pour mesurer l’amélioration."),
  ] }
}

/** Stable choices keep their order while a learner selects and validates. */
export function manualAnswerChoices(expected: number, questionIndex: number, variant: number) {
  const choices = [expected]
  for (const candidate of [-expected, expected * 2, expected / 2, expected + 1, expected - 1, expected + 2]) {
    if (Number.isFinite(candidate) && !choices.includes(candidate)) choices.push(candidate)
    if (choices.length === 4) break
  }
  const position = (questionIndex + variant) % choices.length
  return [...choices.slice(choices.length - position), ...choices.slice(0, choices.length - position)]
}

export function checkManualAnswer(input: string, expected: number) {
  // Formulas and calculators may use a typographic minus instead of ASCII '-'.
  const normalized = input.trim().replace(/[−﹣－]/g, '-').replace(/^([+-])\s+/, '$1').replace(',', '.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return false
  const answer = Number(normalized)
  if (!Number.isFinite(answer) || !Number.isFinite(expected)) return false
  // Match the rounding at the precision actually entered, rather than
  // accepting every nearby number with a broad one-decimal tolerance.
  const decimalPart = normalized.match(/\.([0-9]+)$/)?.[1]
  if (decimalPart && decimalPart.length <= 8) {
    return answer === Number(expected.toFixed(decimalPart.length))
  }
  return Math.abs(answer - expected) <= 1e-9 * Math.max(1, Math.abs(expected))
}
