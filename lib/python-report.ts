import type { LinearState } from './simulation'

const fields = ['step', 'x', 'target', 'w', 'b', 'prediction', 'loss', 'gradW', 'gradB'] as const

export function isLinearState(value: unknown): value is LinearState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  return fields.every(field => typeof state[field] === 'number' && Number.isFinite(state[field]))
    && Number.isInteger(state.step) && (state.step as number) >= 0 && (state.loss as number) >= 0
}

export function readHistory(value: unknown): LinearState[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 501).filter(isLinearState).map((state, step) => ({ ...state, step }))
}
