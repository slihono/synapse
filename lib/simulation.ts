export type LinearState = { step: number; x: number; target: number; w: number; b: number; prediction: number; loss: number; gradW: number; gradB: number }

export function linearState(w: number, b: number, x = 2, y = 1, step = 0): LinearState {
  const prediction = w * x + b
  const error = prediction - y
  return { step, x, target: y, w, b, prediction, loss: 0.5 * error * error, gradW: error * x, gradB: error }
}

export function trainLinear(learningRate: number, steps: number, initialW = 0.2, initialB = 0, x = 2, y = 1) {
  const history: LinearState[] = [linearState(initialW, initialB, x, y, 0)]
  let w = initialW
  let b = initialB
  for (let step = 1; step <= steps; step++) {
    const current = linearState(w, b, x, y, step - 1)
    w -= learningRate * current.gradW
    b -= learningRate * current.gradB
    const next = linearState(w, b, x, y, step)
    if (!Object.values(next).every(Number.isFinite)) break
    history.push(next)
  }
  return history
}

export function sigmoid(z: number) { return 1 / (1 + Math.exp(-z)) }

export function manualNetwork(variant = 0) {
  const x = 2, target = 1, lr = 0.1
  const variants = [
    { w1: 0.5, b1: 0, w2: 1, b2: 0 },
    { w1: 0.25, b1: 0.1, w2: 0.8, b2: 0.05 },
    { w1: 0.75, b1: -0.1, w2: 0.9, b2: 0.02 },
  ]
  const { w1, b1, w2, b2 } = variants[variant % variants.length]
  const z1 = w1 * x + b1
  const h = sigmoid(z1)
  const prediction = w2 * h + b2
  const error = prediction - target
  const loss = 0.5 * error * error
  const dw2 = error * h
  const db2 = error
  const dh = error * w2
  const dz1 = dh * h * (1 - h)
  const dw1 = dz1 * x
  const db1 = dz1
  const updated = { w1: w1 - lr * dw1, b1: b1 - lr * db1, w2: w2 - lr * dw2, b2: b2 - lr * db2 }
  const newHidden = sigmoid(updated.w1 * x + updated.b1)
  const newPrediction = updated.w2 * newHidden + updated.b2
  return { x, target, w1, b1, w2, b2, lr, z1, h, prediction, loss, dw2, db2, dw1, db1, updated, newPrediction, newLoss: 0.5 * (newPrediction - target) ** 2 }
}

export function format(value: number) { return value.toFixed(4) }

export const starterCode = `# Modèle linéaire — complète les expressions manquantes
x = 2.0
y = 1.0
w = 0.2
b = 0.0
learning_rate = 0.1
training_steps = 20

for step in range(training_steps):
    prediction = w * x + b
    error = prediction - y
    loss = 0.5 * error ** 2
    grad_w = error * x
    grad_b = error
    w = w - learning_rate * grad_w
    b = b - learning_rate * grad_b

# Même état que la dernière mise à jour visualisée
prediction = w * x + b
error = prediction - y
loss = 0.5 * error ** 2
print(prediction, loss)`

export function validateCode(code: string) {
  const statements = code
    .split(/\r?\n/)
    .map(line => line.replace(/#.*$/, ''))
    .filter(line => line.trim())
  const expected = [
    /^x\s*=\s*-?(?:\d+(?:\.\d*)?|\.\d+)$/,
    /^y\s*=\s*-?(?:\d+(?:\.\d*)?|\.\d+)$/,
    /^w\s*=\s*-?(?:\d+(?:\.\d*)?|\.\d+)$/,
    /^b\s*=\s*-?(?:\d+(?:\.\d*)?|\.\d+)$/,
    /^learning_rate\s*=\s*-?(?:\d+(?:\.\d*)?|\.\d+)$/,
    /^training_steps\s*=\s*\d+$/,
    /^for\s+step\s+in\s+range\(training_steps\):$/,
    /^prediction\s*=\s*w\s*\*\s*x\s*\+\s*b$/,
    /^error\s*=\s*prediction\s*-\s*y$/,
    /^loss\s*=\s*0\.5\s*\*\s*error\s*\*\*\s*2$/,
    /^grad_w\s*=\s*error\s*\*\s*x$/,
    /^grad_b\s*=\s*error$/,
    /^w\s*=\s*w\s*-\s*learning_rate\s*\*\s*grad_w$/,
    /^b\s*=\s*b\s*-\s*learning_rate\s*\*\s*grad_b$/,
    /^prediction\s*=\s*w\s*\*\s*x\s*\+\s*b$/,
    /^error\s*=\s*prediction\s*-\s*y$/,
    /^loss\s*=\s*0\.5\s*\*\s*error\s*\*\*\s*2$/,
    /^print\(prediction\s*,\s*loss\)$/,
  ]
  const normalized = statements.map(line => line.trim())
  const missing = normalized.length !== expected.length || expected.some((pattern, index) => !pattern.test(normalized[index] ?? ''))
  if (missing) return { valid: false, message: 'Formule manquante ou non prise en charge. Garde les affectations, la boucle et les formules de l’exercice pour synchroniser la visualisation.' }
  if (statements.slice(0, 7).some(line => /^\s/.test(line)) || statements.slice(7, 14).some(line => !/^ {4}\S/.test(line)) || statements.slice(14).some(line => /^\s/.test(line))) {
    return { valid: false, message: 'Vérifie l’indentation : les sept calculs doivent être dans la boucle et l’affichage doit rester après celle-ci.' }
  }
  const parameters = parseParameters(code)
  if (![parameters.x, parameters.y, parameters.w, parameters.b, parameters.learningRate].every(Number.isFinite)) {
    return { valid: false, message: 'Les paramètres doivent être des nombres valides.' }
  }
  if (parameters.learningRate <= 0 || parameters.learningRate > 2 || !Number.isInteger(parameters.steps) || parameters.steps < 1 || parameters.steps > 100) {
    return { valid: false, message: 'Choisis un taux entre 0 et 2 et entre 1 et 100 étapes.' }
  }
  return { valid: true, message: 'Code reconnu : la simulation peut être exécutée en toute sécurité.' }
}

export function parseParameters(code: string) {
  const get = (name: string, fallback: number) => {
    const match = code.match(new RegExp(`^\\s*${name}\\s*=\\s*([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)\\s*(?:#.*)?$`, 'm'))
    return match ? Number(match[1]) : fallback
  }
  return {
    x: get('x', 2),
    y: get('y', 1),
    w: get('w', 0.2),
    b: get('b', 0),
    learningRate: get('learning_rate', 0.1),
    steps: get('training_steps', 20),
  }
}

export function updateCodeParameter(code: string, name: 'learning_rate' | 'training_steps', value: number) {
  if (!Number.isFinite(value)) return code
  const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?'
  return code.replace(new RegExp(`^([ \\t]*${name}[ \\t]*=[ \\t]*)${number}(?=[ \\t]*(?:#|$))`, 'm'), (_, prefix: string) => `${prefix}${value}`)
}

export const quiz = [
  { question: 'À quoi sert la propagation avant ?', options: ['À calculer une prédiction', 'À modifier les poids', 'À choisir un graphique'], answer: 0, explanation: 'Elle fait circuler les entrées vers la sortie pour obtenir une prédiction.' },
  { question: 'Que mesure la fonction de perte ?', options: ['La vitesse du navigateur', 'L’écart entre prédiction et cible', 'Le nombre de neurones'], answer: 1, explanation: 'La perte quantifie l’erreur du modèle par rapport à la cible.' },
  { question: 'Quelle est la différence principale entre rétropropagation et descente de gradient ?', options: ['Aucune', 'La rétropropagation calcule les gradients, la descente les utilise', 'La descente calcule les gradients'], answer: 1, explanation: 'La rétropropagation remonte la chaîne pour obtenir les gradients, puis la descente met à jour les paramètres.' },
  { question: 'Que signifie un gradient négatif ?', options: ['Le paramètre doit généralement augmenter', 'Le modèle est cassé', 'La perte est forcément nulle'], answer: 0, explanation: 'Avec paramètre = paramètre − taux × gradient, un gradient négatif produit une augmentation.' },
  { question: 'Que peut provoquer un taux d’apprentissage trop élevé ?', options: ['Toujours une meilleure solution', 'Des oscillations ou une divergence', 'La suppression de la cible'], answer: 1, explanation: 'De grands pas peuvent dépasser le minimum et rendre la perte instable.' },
]

export type QuizItem = typeof quiz[number]
export type ManualNetwork = ReturnType<typeof manualNetwork>
export type History = ReturnType<typeof trainLinear>
