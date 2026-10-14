'use client'

import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useTranslation } from '@/lib/translation-context'
import { animationPhases, inspectTransition } from '@/lib/network-animation'
import { format, type LinearState } from '@/lib/simulation'

export function NetworkAnimation({ state, previous, phase, running, learningRate }: {
  state: LinearState; previous?: LinearState; phase: number; running: boolean; learningRate: number | null
}) {
  const t = useTranslation()
  const transition = inspectTransition(state, previous, learningRate)
  const before = transition.before
  const displayed = phase >= 3 ? state : before
  const error = before.prediction - before.target
  const forward = phase === 0
  const backward = phase === 2
  const formula = phase === 0 ? `ŷ = ${format(before.w)} × ${format(before.x)} + ${format(before.b)} = ${format(before.prediction)}`
    : phase === 1 ? `e = ${format(before.prediction)} − ${format(before.target)} = ${format(error)} · L = ½ × (${format(error)})² = ${format(before.loss)}`
    : phase === 2 ? `∂L/∂ŷ = ${format(error)} · ∂L/∂w = e × x = ${format(before.gradW)} · ∂L/∂b = e = ${format(before.gradB)}`
    : phase === 3 && transition.hasUpdate ? (transition.gradientUpdate
      ? `w = ${format(before.w)} − ${learningRate} × (${format(before.gradW)}) = ${format(state.w)} · b = ${format(before.b)} − ${learningRate} × (${format(before.gradB)}) = ${format(state.b)}`
      : `w : ${format(before.w)} → ${format(state.w)} (Δw = ${format(transition.deltaW)}) · b : ${format(before.b)} → ${format(state.b)} (Δb = ${format(transition.deltaB)})`)
    : `ŷ = ${format(state.w)} × ${format(state.x)} + ${format(state.b)} = ${format(state.prediction)} · L = ${format(state.loss)}`
  return <div data-network-animation data-phase={phase} className="overflow-hidden rounded-2xl border bg-slate-950 text-white shadow-inner">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
      <p className="text-sm font-semibold text-violet-200">{t(phase === 3 && !transition.hasUpdate ? 'Init.' : animationPhases[phase])}</p>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{t('Étape')} {state.step} · {phase + 1} / 5</span>
    </div>
    <div className="overflow-x-auto px-5 py-8" dir="ltr">
      <div className="flex min-w-[520px] items-center gap-5">
        <div className="flex w-24 shrink-0 flex-col items-center gap-2"><div className={`network-node grid size-20 place-items-center rounded-full border-2 border-blue-400 bg-blue-500/15 font-mono text-xl ${forward ? 'network-node-active' : ''}`}>x</div><span className="text-xs text-blue-200">{t('entrée = ')}{format(displayed.x)}</span></div>
        <div className="relative flex-1"><span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 font-mono text-xs text-blue-200">w = {format(displayed.w)}</span><div className="h-1 rounded-full bg-blue-400/50" />{backward ? <ArrowLeft className="absolute -left-1 -top-2.5 size-6 text-orange-300" /> : <ArrowRight className="absolute -right-1 -top-2.5 size-6 text-blue-300" />}{(forward || backward) && <span key={`left-${state.step}-${phase}`} className={`network-signal ${backward ? 'network-signal-backward bg-orange-300' : 'bg-blue-200'}`} style={{ animationDelay: backward ? '.3s' : '0s', animationPlayState: running ? 'running' : 'paused' }} />}</div>
        <div className="flex w-28 shrink-0 flex-col items-center gap-2"><div className={`network-node grid size-20 place-items-center rounded-full border-2 border-violet-400 bg-violet-500/15 font-mono text-2xl ${phase === 3 ? 'network-node-active' : ''}`}>Σ</div><span className="whitespace-nowrap text-xs text-violet-200">+ b = {format(displayed.b)}</span></div>
        <div className="relative flex-1"><div className="h-1 rounded-full bg-violet-400/50" />{backward ? <ArrowLeft className="absolute -left-1 -top-2.5 size-6 text-orange-300" /> : <ArrowRight className="absolute -right-1 -top-2.5 size-6 text-violet-300" />}{(forward || backward) && <span key={`right-${state.step}-${phase}`} className={`network-signal ${backward ? 'network-signal-backward bg-orange-300' : 'bg-violet-200'}`} style={{ animationDelay: forward ? '.3s' : '0s', animationPlayState: running ? 'running' : 'paused' }} />}</div>
        <div className="flex w-28 shrink-0 flex-col items-center gap-2"><div className={`network-node grid size-20 place-items-center rounded-full border-2 border-emerald-400 bg-emerald-500/15 font-mono text-lg ${phase === 1 || phase === 4 ? 'network-node-active' : ''}`}>{format(displayed.prediction)}</div><span className="text-xs text-emerald-200">{t('Prédiction')}</span></div>
      </div>
      <div className={`mt-8 rounded-xl border p-4 font-mono text-sm leading-7 ${phase === 1 || phase === 2 ? 'border-orange-400/50 bg-orange-400/10 text-orange-100' : 'border-white/10 bg-white/5 text-slate-200'}`} aria-live="off">{formula}</div>
    </div>
    <div className="space-y-3 border-t border-white/10 px-5 py-4">
      <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">{animationPhases.map((name, index) => <span key={name} className={`h-1 rounded-full transition-colors ${index <= phase ? 'bg-violet-400' : 'bg-slate-700'}`} />)}</div>
      <p className="text-xs leading-5 text-slate-300">{t(transition.hasUpdate ? 'Les calculs partent de l’état précédent et se terminent à l’étape inspectée.' : 'Initialisation : calcul de la prédiction et des gradients, sans mise à jour.')}</p>
      {phase === 3 && transition.hasUpdate && !transition.gradientUpdate && <p className="text-xs leading-5 text-orange-200">{t(learningRate == null ? 'Paramètres mis à jour dans Python ; le taux n’est pas connu.' : 'Mise à jour observée dans Python : elle ne correspond pas à un pas de gradient avec ce taux.')}</p>}
    </div>
  </div>
}
