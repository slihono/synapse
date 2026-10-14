'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronLeft } from 'lucide-react'
import { manualSteps, checkManualAnswer } from '@/lib/manual-exercise'
import { manualNetwork } from '@/lib/simulation'
import { useTranslation } from '@/lib/translation-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const stages = ['Propagation avant', 'Calculer la perte', 'Rétropropagation', 'Descente de gradient', 'Vérifier le résultat']

export function ManualActivity({ onContinue, onRestart }: { onContinue: () => void; onRestart: () => void }) {
  const t = useTranslation()
  const [variant, setVariant] = useState(0)
  const { network: n, steps } = useMemo(() => manualSteps(manualNetwork(variant)), [variant])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [solved, setSolved] = useState<Record<number, boolean>>({})
  const [wrong, setWrong] = useState(false)
  const current = steps[index]
  const complete = steps.every((_, i) => solved[i])
  const known = (i: number) => solved[i] ? steps[i].value.toFixed(8) : '?'
  const move = (next: number) => { setIndex(next); setWrong(false) }
  return <section id="learn" className="space-y-5">
    <div><p className="mb-2 text-xs font-semibold text-blue-700">{t('ACTIVITÉ 1 · PAS À PAS')}</p><h2 className="text-2xl font-bold">{t('Apprends à un réseau à corriger ses erreurs')}</h2><p className="mt-2 text-sm text-slate-600">{t('Calcule chaque valeur avant de passer à la suivante. Les réponses sont révélées après validation.')}</p></div>
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <Card><CardHeader><CardTitle>{t('Le réseau de départ')}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div dir="ltr" className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-slate-950 p-5 text-slate-100">
          <div className="rounded-xl border border-blue-400 p-3 text-center font-mono text-sm">x = {n.x}<br />y = {n.target}</div><ArrowRight className="text-blue-300" />
          <div className="rounded-xl border border-violet-400 p-3 text-center font-mono text-sm">z₁ = {known(0)}<br />h = {known(1)}</div><ArrowRight className="text-violet-300" />
          <div className="rounded-xl border border-emerald-400 p-3 text-center font-mono text-sm">ŷ = {known(2)}</div>
        </div>
        <p dir="ltr" className="font-mono text-sm">w₁ = {n.w1} · b₁ = {n.b1}<br />w₂ = {n.w2} · b₂ = {n.b2} · η = {n.lr}</p>
        <p className="text-sm leading-6 text-slate-600">{t('w₁ et w₂ sont des poids indépendants, donnés au départ.')}</p>
        <div className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">{t('Les nombres affichés sont arrondis à 8 décimales. Le moteur garde la précision complète. Une réponse arrondie à 4 décimales est acceptée ; utilise les valeurs à 8 décimales pour les calculs suivants.')}</div>
        <details className="text-sm text-slate-600"><summary className="cursor-pointer">{t('Valeurs validées en précision complète')}</summary><div className="mt-2 space-y-1 font-mono" dir="ltr">{steps.filter((_, i) => solved[i]).map(step => <p key={step.symbol}>{step.symbol} = {String(step.value)}</p>)}</div></details>
      </CardContent></Card>
      <Card className="border-violet-200"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">{t(stages[current.stage])}</CardTitle><span className="text-xs text-slate-600">{t('Étape')} {index + 1} / {steps.length}</span></div><Progress value={Object.keys(solved).length / steps.length * 100} /></CardHeader><CardContent className="space-y-5">
        <p className="text-sm leading-6 text-slate-700">{t(current.explanation)}</p>
        <div dir="ltr" className="overflow-x-auto rounded-xl bg-violet-50 p-4 font-mono text-sm leading-7 text-violet-950">{current.formula}<br /><strong className="text-xl">{current.symbol} = ?</strong></div>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); const correct = checkManualAnswer(answers[index] ?? '', current.value); setWrong(!correct); if (correct) setSolved(previous => ({ ...previous, [index]: true })) }}>
          <label className="grid gap-2 text-sm font-medium">{t('Ta réponse')}<Input dir="ltr" inputMode="decimal" autoComplete="off" aria-label={`${current.symbol} = ?`} value={answers[index] ?? ''} disabled={solved[index]} onChange={event => { setAnswers(previous => ({ ...previous, [index]: event.target.value })); setWrong(false) }} /></label>
          {!solved[index] && <Button type="submit">{t('Vérifier ma réponse')}</Button>}
        </form>
        {wrong && <p role="alert" className="text-sm text-rose-700">{t('Vérifie la formule et les arrondis, puis réessaie.')}</p>}
        {solved[index] && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="flex gap-2 font-medium text-emerald-800"><Check className="size-4" />{t('Bonne réponse. Tu peux avancer.')}</p><p dir="ltr" className="mt-2 font-mono">{current.symbol} ≈ {current.value.toFixed(8)}</p></div>}
        <div className="flex flex-wrap justify-between gap-2"><Button variant="outline" disabled={index === 0} onClick={() => move(index - 1)}><ChevronLeft />{t('Précédent')}</Button>{index < steps.length - 1 ? <Button disabled={!solved[index]} onClick={() => move(index + 1)}>{t('Étape suivante')}<ArrowRight /></Button> : <Button disabled={!complete} onClick={onContinue}>{t('Passer à l’expérience Python')}<ArrowRight /></Button>}</div>
        {complete && <Button variant="outline" onClick={() => { setVariant(value => value + 1); setIndex(0); setAnswers({}); setSolved({}); setWrong(false); onRestart() }}>{t('Faire un autre exercice')}</Button>}
      </CardContent></Card>
    </div>
  </section>
}
