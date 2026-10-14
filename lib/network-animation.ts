import type { LinearState } from './simulation'

export const PHASE_DURATION = 900
export const animationPhases = ['Propagation avant', 'Calculer la perte', 'Rétropropagation', 'Mise à jour :', 'Vérifier le résultat'] as const

export function inspectTransition(current: LinearState, previous?: LinearState, learningRate?: number | null) {
  const before = previous ?? current
  const matches = (actual: number, expected: number) => Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(actual), Math.abs(expected))
  const gradientUpdate = Boolean(previous && learningRate != null && before.x === current.x && before.target === current.target
    && matches(current.w, before.w - learningRate * before.gradW)
    && matches(current.b, before.b - learningRate * before.gradB))
  return { before, after: current, hasUpdate: Boolean(previous), gradientUpdate, deltaW: current.w - before.w, deltaB: current.b - before.b }
}
