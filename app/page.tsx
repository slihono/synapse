'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Code2, Gauge, GitBranch, Languages, Lightbulb, Network, Pause, Play, RotateCcw, Sparkles, Target, TrendingDown, Trophy, Zap } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ManualActivity } from '@/components/manual-activity'
import { localizePythonComments } from '@/lib/python-comments'
import { NetworkAnimation } from '@/components/network-animation'
import { PHASE_DURATION } from '@/lib/network-animation'
import { readHistory } from '@/lib/python-report'
import { interpolate } from '@/lib/i18n'
import { TranslationProvider, useTranslation } from '@/lib/translation-context'
import { translate } from '@/lib/translations'
import { manualNetwork, format, parseParameters, readCodeParameter, trainingTrend, updateCodeParameter, quiz, starterCode, trainLinear, type History } from '@/lib/simulation'

const nav = [{ label: 'Apprendre', icon: Network }, { label: 'Expérimenter', icon: Code2 }, { label: 'Visualiser le modèle', icon: Activity }, { label: 'Vérifier mes connaissances', icon: CircleHelp }]

function Metric({ label, value, tone = 'blue' }: { label: string; value: string; tone?: string }) {
  const t = useTranslation()

  const toneClasses = ({ blue: 'bg-blue-50/60 text-blue-800', violet: 'bg-violet-50/60 text-violet-800', orange: 'bg-orange-50/60 text-orange-800', emerald: 'bg-emerald-50/60 text-emerald-800' } as Record<string, string>)[tone] ?? 'bg-slate-50 text-slate-800'
  return <div className={`rounded-xl border p-3 ${toneClasses}`}><p className="text-xs font-semibold">{t(label)}</p><p className="mt-1 break-all font-mono text-lg font-semibold">{value}</p></div>
}

function CodeLab({ onRun, unlocked, language }: { onRun: (history: History, learningRate: number | null) => void; unlocked: boolean; language: Language }) {
  const t = useTranslation()

  const [code, setCode] = useState(() => localizePythonComments(starterCode, language))
  useEffect(() => { setCode(previous => localizePythonComments(previous, language)) }, [language])
  const [message, setMessage] = useState('')
  const [output, setOutput] = useState('')
  const [outputTruncated, setOutputTruncated] = useState(false)
  const [running, setRunning] = useState(false)
  const [params, setParams] = useState<{ x: number; y: number; learningRate: number | null; steps: number }>({ x: 2, y: 1, learningRate: .1, steps: 20 })
  const runController = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!unlocked) {
      runController.current?.abort()
      setRunning(false)
      setMessage('')
    }
    return () => runController.current?.abort()
  }, [unlocked])
  const rateEditable = readCodeParameter(code, 'learning_rate') !== null
  const stepsEditable = readCodeParameter(code, 'training_steps') !== null
  const words = {
    fr: { running: 'Exécution en cours…', run: 'Exécuter', output: 'Sortie Python', reset: 'Réinitialiser le code', hint: 'Indice', params: 'Paramètres du programme', sync: 'Les résultats viennent maintenant du vrai interpréteur Python.', rate: 'Taux d’apprentissage', steps: 'Étapes d’entraînement', why: 'Exécution isolée', explain: 'Python 3 s’exécute dans un bac à sable temporaire. Le temps, la mémoire et la sortie sont limités. Les variables x, y, w et b relient un entraînement au diagramme et aux graphiques.', noTrace: 'Aucun état d’entraînement x, y, w, b détecté : la sortie Python est affichée ci-dessus.', success: 'Python exécuté : les états détectés alimentent le diagramme et les graphiques.', failure: 'Impossible d’exécuter Python pour le moment.', timeout: 'Temps limite atteint (12 s). Réduis la charge de calcul et réessaie.' },
    en: { running: 'Running…', run: 'Run', output: 'Python output', reset: 'Reset code', hint: 'Hint', params: 'Program parameters', sync: 'Results now come from the Python interpreter.', rate: 'Learning rate', steps: 'Training steps', why: 'Isolated execution', explain: 'Python 3 runs in a temporary sandbox. Execution time, memory, and output are limited. Variables x, y, w, and b connect a training run to the diagram and charts.', noTrace: 'No training state with x, y, w, b was detected. Python output is shown above.', success: 'Python ran: detected states now power the diagram and charts.', failure: 'Python could not run right now.', timeout: 'Time limit reached (12 s). Reduce the workload and try again.' },
    es: { running: 'Ejecutando…', run: 'Ejecutar', output: 'Salida de Python', reset: 'Restablecer código', hint: 'Pista', params: 'Parámetros del programa', sync: 'Los resultados proceden del intérprete de Python.', rate: 'Tasa de aprendizaje', steps: 'Pasos de entrenamiento', why: 'Ejecución aislada', explain: 'Python 3 se ejecuta en un entorno temporal aislado. El tiempo, la memoria y la salida son limitados. Las variables x, y, w y b conectan el entrenamiento con el diagrama y los gráficos.', noTrace: 'No se detectaron estados de entrenamiento x, y, w, b. La salida de Python aparece arriba.', success: 'Python se ejecutó: los estados detectados alimentan el diagrama y los gráficos.', failure: 'No se pudo ejecutar Python ahora.', timeout: 'Se alcanzó el límite de 12 s. Reduce el trabajo y vuelve a intentarlo.' },
    ar: { running: 'جارٍ التنفيذ…', run: 'تشغيل', output: 'مخرجات Python', reset: 'إعادة ضبط الرمز', hint: 'تلميح', params: 'معلمات البرنامج', sync: 'تأتي النتائج الآن من مفسر Python.', rate: 'معدل التعلّم', steps: 'خطوات التدريب', why: 'تنفيذ معزول', explain: 'يعمل Python 3 في بيئة مؤقتة معزولة. توجد حدود للوقت والذاكرة والمخرجات. تربط المتغيرات x وy وw وb التدريب بالمخطط والرسوم البيانية.', noTrace: 'لم يتم العثور على حالة تدريب للمتغيرات x وy وw وb. تظهر مخرجات Python أعلاه.', success: 'تم تشغيل Python: الحالات المكتشفة تغذي المخطط والرسوم.', failure: 'تعذر تشغيل Python الآن.', timeout: 'انتهت مهلة 12 ثانية. قلل حجم العمل وحاول مجددًا.' },
    hi: { running: 'चल रहा है…', run: 'चलाएँ', output: 'Python आउटपुट', reset: 'कोड रीसेट करें', hint: 'संकेत', params: 'प्रोग्राम पैरामीटर', sync: 'परिणाम अब Python इंटरप्रेटर से आते हैं।', rate: 'लर्निंग रेट', steps: 'ट्रेनिंग चरण', why: 'अलग वातावरण में निष्पादन', explain: 'Python 3 एक अस्थायी सैंडबॉक्स में चलता है। समय, मेमोरी और आउटपुट सीमित हैं। x, y, w और b वैरिएबल प्रशिक्षण को डायग्राम और चार्ट से जोड़ते हैं।', noTrace: 'x, y, w, b वाला प्रशिक्षण नहीं मिला। Python आउटपुट ऊपर दिखाया गया है।', success: 'Python चल गया: मिले हुए स्टेट्स अब डायग्राम और चार्ट चलाते हैं।', failure: 'अभी Python नहीं चल सका।', timeout: '12 सेकंड की सीमा पूरी हुई। काम कम करके फिर प्रयास करें।' },
    tr: { running: 'Çalışıyor…', run: 'Çalıştır', output: 'Python çıktısı', reset: 'Kodu sıfırla', hint: 'İpucu', params: 'Program parametreleri', sync: 'Sonuçlar artık Python yorumlayıcısından geliyor.', rate: 'Öğrenme oranı', steps: 'Eğitim adımları', why: 'Yalıtılmış çalıştırma', explain: 'Python 3 geçici bir korumalı alanda çalışır. Süre, bellek ve çıktı sınırlıdır. x, y, w ve b değişkenleri eğitimi diyagrama ve grafiklere bağlar.', noTrace: 'x, y, w, b içeren bir eğitim durumu bulunamadı. Python çıktısı yukarıda gösteriliyor.', success: 'Python çalıştı: bulunan durumlar diyagramı ve grafikleri besliyor.', failure: 'Python şu anda çalıştırılamadı.', timeout: '12 saniyelik süre sınırına ulaşıldı. İş yükünü azaltıp yeniden deneyin.' },
    pt: { running: 'A executar…', run: 'Executar', output: 'Saída do Python', reset: 'Repor o código', hint: 'Dica', params: 'Parâmetros do programa', sync: 'Os resultados vêm agora do interpretador Python.', rate: 'Taxa de aprendizagem', steps: 'Etapas de treino', why: 'Execução isolada', explain: 'O Python 3 é executado numa área temporária isolada. O tempo, a memória e a saída são limitados. As variáveis x, y, w e b ligam o treino ao diagrama e aos gráficos.', noTrace: 'Não foi detetado um estado de treino com x, y, w, b. A saída Python aparece acima.', success: 'Python executado: os estados detetados alimentam o diagrama e os gráficos.', failure: 'Não foi possível executar Python agora.', timeout: 'Limite de 12 s atingido. Reduza a carga e tente novamente.' },
  }[language]
  const run = async () => {
    if (!unlocked || running) return
    const controller = new AbortController()
    runController.current = controller
    const timeout = window.setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), 55_000)
    setRunning(true)
    setMessage('')
    setOutput('')
    setOutputTruncated(false)
    try {
      const response = await fetch('/api/python', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }), signal: controller.signal })
      const result = await response.json() as { error?: string; stdout?: string; stderr?: string; truncated?: boolean; failed?: boolean; learningRate?: number | null; trainingSteps?: number | null; history?: History }
      if (controller.signal.aborted && controller.signal.reason?.name !== 'TimeoutError') return
      if (!response.ok || result.error) {
        const sourceError = result.error ?? ''
        throw new Error(response.status === 408 ? 'Temps limite atteint (12 s). Réduis la charge de calcul et réessaie.' : sourceError || 'Impossible d’exécuter Python pour le moment.')
      }
      const nextHistory = readHistory(result.history)
      setOutput([result.stdout?.trimEnd(), result.stderr?.trimEnd() ? `stderr:\n${result.stderr.trimEnd()}` : ''].filter(Boolean).join('\n'))
      setOutputTruncated(Boolean(result.truncated))
      if (nextHistory.length > 0) {
        const last = nextHistory.at(-1)!
        const actualRate = typeof result.learningRate === 'number' && Number.isFinite(result.learningRate) ? result.learningRate : readCodeParameter(code, 'learning_rate')
        setParams({ x: last.x, y: last.target, learningRate: actualRate, steps: typeof result.trainingSteps === 'number' && Number.isSafeInteger(result.trainingSteps) && result.trainingSteps >= 0 ? result.trainingSteps : readCodeParameter(code, 'training_steps') ?? Math.max(1, nextHistory.length - 1) })
        onRun(nextHistory, actualRate)
        setMessage(result.failed ? 'Impossible d’exécuter Python pour le moment.' : 'Python exécuté : les états détectés alimentent le diagramme et les graphiques.')
      } else {
        setMessage(result.failed ? 'Impossible d’exécuter Python pour le moment.' : 'Aucun état d’entraînement x, y, w, b détecté : la sortie Python est affichée ci-dessus.')
      }
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason?.name !== 'TimeoutError') return
      setMessage(error instanceof Error ? (error.name === 'TimeoutError' ? 'Temps limite atteint (12 s). Réduis la charge de calcul et réessaie.' : (error instanceof TypeError || error instanceof SyntaxError) ? 'Impossible d’exécuter Python pour le moment.' : error.message) : 'Impossible d’exécuter Python pour le moment.')
    } finally {
      window.clearTimeout(timeout)
      if (runController.current === controller) { runController.current = null; setRunning(false) }
    }
  }
  return <section id="experiment" className="scroll-mt-6 space-y-5"><div><Badge className="mb-3 bg-violet-100 text-violet-700 hover:bg-violet-100">{t("ACTIVITÉ 2 · SIMULATION")}</Badge> {!unlocked && <Alert className="mt-4 border-orange-200 bg-orange-50"><AlertDescription><strong>{t("Exercice verrouillé :")}</strong>{t(" tu ne peux pas faire cet exercice tant que le réseau de départ n’est pas terminé. Termine tous les calculs guidés avant de continuer.")}</AlertDescription></Alert>}<h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t("Maintenant, fais apprendre le modèle toi-même")}</h2><p className="mt-2 max-w-2xl text-muted-foreground">{t("Modifie le programme, valide tes formules et exécute du vrai code Python dans un environnement isolé.")}</p></div><p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">{t('Le programme Python utilise un autre modèle : ŷ = wx + b, sans sigmoïde. Par défaut, il part de 0,4 et fait 20 mises à jour vers la cible 1. Ce n’est pas la suite numérique du réseau précédent ; le résultat reste légèrement inférieur à 1.')}</p><Card className="overflow-hidden border-slate-200 shadow-sm"><div className="grid lg:grid-cols-[1.2fr_.8fr]"><div className="border-b bg-[#101827] p-4 lg:border-b-0 lg:border-r"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-slate-200"><Code2 className="text-violet-300" /> exercice.py</div><Badge variant="outline" className="border-violet-400/40 bg-violet-400/10 text-violet-200">Python 3 · Vercel Sandbox</Badge></div><Textarea dir="ltr" disabled={running} value={code} onChange={e => { const next = e.target.value; setCode(next); const parsed = parseParameters(next); setParams({ x: parsed.x, y: parsed.y, learningRate: readCodeParameter(next, 'learning_rate'), steps: parsed.steps }) }} aria-label={t("Code Python de l'exercice")} className="min-h-[390px] resize-y border-slate-700 bg-slate-950 font-mono text-[13px] leading-6 text-slate-200 placeholder:text-slate-500 focus-visible:ring-violet-400" spellCheck={false} /><div className="mt-3 flex flex-wrap gap-2"><Button onClick={run} disabled={!unlocked || running} className="bg-violet-500 text-white hover:bg-violet-600"><Play data-icon="inline-start" />{running ? words.running : words.run}</Button><Button variant="outline" disabled={running} onClick={() => { setCode(localizePythonComments(starterCode, language)); setParams({ x: 2, y: 1, learningRate: .1, steps: 20 }); setMessage(''); setOutput(''); setOutputTruncated(false) }} className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"><RotateCcw data-icon="inline-start" />{words.reset}</Button><Button variant="ghost" onClick={() => setMessage('Indice : vérifie prediction, loss, grad_w, grad_b et les deux formules de mise à jour.')} className="text-slate-300"><Lightbulb data-icon="inline-start" />{words.hint}</Button></div>{output && <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-200"><p className="mb-2 text-xs font-semibold text-violet-300">{words.output}</p><pre dir="ltr" className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">{output}</pre>{outputTruncated && <p className="mt-2 text-xs text-slate-400">{t('… sortie tronquée')}</p>}</div>}</div><div className="space-y-5 p-5"><div><p className="text-sm font-semibold text-slate-900">{words.params}</p><p className="mt-1 text-xs text-muted-foreground">{words.sync}</p></div><div className="grid grid-cols-2 gap-3"><Metric label="x" value={format(params.x)} /><Metric label="y" value={format(params.y)} tone="violet" /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><label className="grid gap-1 text-sm"><span className="text-muted-foreground">{words.rate}</span><Input type="number" min="0.001" max="2" step="0.01" value={params.learningRate ?? ''} disabled={running || !rateEditable} onChange={e => { const v = Number(e.target.value); if (!Number.isFinite(v) || v <= 0 || v > 2) return; setCode(c => updateCodeParameter(c, 'learning_rate', v)); setParams(p => ({ ...p, learningRate: v })) }} /></label><label className="grid gap-1 text-sm"><span className="text-muted-foreground">{words.steps}</span><Input type="number" min="1" max="100" value={params.steps} disabled={running || !stepsEditable} onChange={e => { const v = Number(e.target.value); if (!Number.isInteger(v) || v < 1 || v > 100) return; setCode(c => updateCodeParameter(c, 'training_steps', v)); setParams(p => ({ ...p, steps: v })) }} /></label></div>{message && <Alert className={message === 'Python exécuté : les états détectés alimentent le diagramme et les graphiques.' ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}><AlertDescription>{t(message)}</AlertDescription></Alert>}<div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-muted-foreground"><p className="font-medium text-slate-800">{words.why}</p><p className="mt-1">{words.explain}</p></div></div></div></Card></section>
}

function TrainingLab({ history, learningRate, setLearningRate, language }: { history: History; learningRate: number | null; setLearningRate: (v: number) => void; language: Language }) {
  const t = useTranslation()

  const [selected, setSelected] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [phase, setPhase] = useState(0)
  const [animating, setAnimating] = useState(true)
  const inspect = (index: number) => {
    setSelected(Math.max(0, Math.min(history.length - 1, index)))
    setPhase(0)
    setAnimating(true)
    setPlaying(false)
  }
  useEffect(() => { setSelected(0); setPlaying(false) }, [history])
  useEffect(() => { setPhase(0); setAnimating(true) }, [selected, history])
  useEffect(() => {
    if (!animating) return
    const timer = window.setTimeout(() => {
      if (phase < 4) setPhase(value => value + 1)
      else if (playing && selected < history.length - 1) setSelected(index => index + 1)
      else { setAnimating(false); setPlaying(false) }
    }, PHASE_DURATION)
    return () => window.clearTimeout(timer)
  }, [animating, phase, playing, selected, history.length])
  const togglePlayback = () => {
    if (animating) { setAnimating(false); setPlaying(false); return }
    if (phase === 4) { setPhase(0); if (selected === history.length - 1) setSelected(0) }
    setAnimating(true)
    setPlaying(true)
  }
  const selectedIndex = Math.min(selected, history.length - 1)
  const state = history[selectedIndex]
  const trend = trainingTrend(history)
  const status = trend === 'unchanged' ? 'La perte est inchangée : aucune amélioration ni augmentation détectée.' : trend === 'improving' ? 'Le modèle apprend : sa prédiction se rapproche de la cible et sa perte diminue.' : 'La perte augmente : ce taux est peut-être trop élevé, le modèle dépasse la bonne direction.'
  return <section id="visualize" className="scroll-mt-6 space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><Badge className="mb-3 bg-orange-100 text-orange-700 hover:bg-orange-100">{t("LABORATOIRE · VUE INTERNE")}</Badge><h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t("Visualise chaque mise à jour")}</h2><p className="mt-2 max-w-2xl text-muted-foreground">{t("Sélectionne un instant : le diagramme, les métriques et l’historique utilisent exactement le même état calculé.")}</p></div><div className="flex items-center gap-2 rounded-xl border bg-white p-2"><Button size="icon" variant="outline" onClick={() => inspect(selectedIndex - 1)} aria-label={t("Étape précédente")}><ChevronLeft /></Button><Button size="icon" onClick={togglePlayback} aria-label={t(animating ? 'Pause' : 'Lecture')}>{animating ? <Pause /> : <Play />}</Button><Button size="icon" variant="outline" onClick={() => inspect(selectedIndex + 1)} aria-label={t("Étape suivante")}><ChevronRight /></Button><Button size="sm" variant="ghost" onClick={() => inspect(0)}><RotateCcw data-icon="inline-start" />{t("Recommencer")}</Button></div></div>
    <NetworkAnimation state={state} previous={selectedIndex > 0 ? history[selectedIndex - 1] : undefined} phase={phase} running={animating} learningRate={learningRate} />
    <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => inspect(selectedIndex)}><RotateCcw data-icon="inline-start" />{t('Rejouer cette étape')}</Button></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8"><Metric label={t("étape")} value={`${state.step}`} tone="violet" /><Metric label={t("prédiction")} value={String(state.prediction)} tone="blue" /><Metric label={t("perte")} value={format(state.loss)} tone="orange" /><Metric label={t("erreur")} value={format(state.prediction - state.target)} tone="orange" /><Metric label={t("gradient w")} value={format(state.gradW)} tone="violet" /><Metric label={t("gradient b")} value={format(state.gradB)} tone="violet" /><Metric label={t("poids w")} value={format(state.w)} tone="emerald" /><Metric label={t("biais b")} value={format(state.b)} tone="emerald" /></div>
      <Card className="border-slate-200 shadow-sm"><CardContent className="space-y-3 pt-6"><div className="flex items-center justify-between text-sm"><span className="font-medium">{t("Étape inspectée : ")}{state.step} / {history.length - 1}</span><span className="text-muted-foreground">{t('Animation : 5 phases par étape')}</span></div><Slider value={[selectedIndex]} min={0} max={Math.max(1, history.length - 1)} disabled={history.length < 2} step={1} onValueChange={v => inspect(Array.isArray(v) ? v[0] : v)} aria-label={t("Étape d'entraînement")} /></CardContent></Card>
    <Alert className={trend === 'improving' ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}><TrendingDown className={trend === 'improving' ? 'text-emerald-600' : 'text-orange-600'} /><AlertDescription>{t(status)}</AlertDescription></Alert>
    <div className="grid gap-5 xl:grid-cols-3"><ChartCard title={t("Perte par étape")} data={history} dataKey="loss" color="var(--color-loss)" type="area" /><ChartCard title={t("Prédiction et cible")} data={history.map(s => ({ ...s, target: s.target }))} dataKey="prediction" color="var(--color-prediction)" target /><ChartCard title={t("Poids et biais")} data={history} dataKey="w" color="var(--color-weight)" bias /></div>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-base">{t("Historique d’entraînement")}</CardTitle><CardDescription>{t("Clique sur une ligne pour inspecter cet état dans le réseau.")}</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{t("Étape")}</TableHead><TableHead>{t("Prédiction")}</TableHead><TableHead>{t("Perte")}</TableHead><TableHead>{t("Poids")}</TableHead><TableHead>{t("Biais")}</TableHead><TableHead>{t("Gradient w")}</TableHead></TableRow></TableHeader><TableBody>{history.filter((_, i) => i === 0 || i % 2 === 0 || i === history.length - 1).map(row => <TableRow key={row.step} aria-selected={row.step === selectedIndex} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspect(row.step) } }} className={`cursor-pointer transition-colors hover:bg-muted/50 ${row.step === selectedIndex ? 'bg-violet-100' : ''}`} style={row.step === selectedIndex ? { backgroundColor: '#ede9fe', color: '#1e1b4b', boxShadow: 'inset 4px 0 #7c3aed' } : undefined} onClick={() => inspect(row.step)}><TableCell className="font-medium">{row.step === 0 ? t('Init.') : row.step}</TableCell><TableCell>{format(row.prediction)}</TableCell><TableCell>{format(row.loss)}</TableCell><TableCell>{format(row.w)}</TableCell><TableCell>{format(row.b)}</TableCell><TableCell className={row.step === selectedIndex ? "font-medium text-violet-900" : "text-violet-700"}>{format(row.gradW)}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
    <RateComparison initial={history[0]} steps={history.length - 1} active={learningRate} onSelect={setLearningRate} language={language} />
  </section>
}

function ChartCard({ title, data, dataKey, color, type, target, bias }: { title: string; data: History | (History[number] & { target: number })[]; dataKey: string; color: string; type?: string; target?: boolean; bias?: boolean }) {
  const t = useTranslation()

  return <Card className="min-w-0 border-slate-200 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm">{t(title)}</CardTitle></CardHeader><CardContent className="h-56 pl-1 pr-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="step" tickLine={false} axisLine={false} fontSize={11} /><YAxis tickLine={false} axisLine={false} fontSize={11} width={36} /><ChartTooltip labelFormatter={step => `${t('Étape')} ${step}`} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} /><Line type="monotone" dataKey={dataKey} name={t(dataKey === 'prediction' ? 'Prédiction' : dataKey === 'loss' ? 'Perte' : 'Poids')} stroke={color} strokeWidth={2.5} dot={false} /><>{target && <Line type="monotone" dataKey="target" name={t('cible')} stroke="#94a3b8" strokeDasharray="4 4" dot={false} />}{bias && <Line type="monotone" dataKey="b" name={t('Biais')} stroke="var(--color-bias)" strokeWidth={2} dot={false} />}</></LineChart></ResponsiveContainer></CardContent></Card>
}

function RateComparison({ initial, steps, active, onSelect, language }: { initial: History[number]; steps: number; active: number | null; onSelect: (v: number) => void; language: Language }) {
  const t = useTranslation()

  const rates = [.01, .1, .5]
  const labels = {
    fr: ['Comparer les trois taux', 'Mêmes paramètres de départ, trois tailles de pas différentes.', 'Taux intermédiaire', 'lent', 'équilibré', 'rapide', 'perte finale :', 'échelle log₁₀', 'Un taux plus élevé n’est pas automatiquement meilleur : il peut accélérer l’apprentissage, mais aussi créer du dépassement ou de l’instabilité.'],
    en: ['Compare the three rates', 'Same starting parameters, three different step sizes.', 'Middle rate', 'slow', 'balanced', 'fast', 'final loss:', 'log₁₀ scale', 'A higher rate is not always better: it can speed up learning, but may also cause overshooting or instability.'],
    es: ['Compara las tres tasas', 'Mismos parámetros iniciales y tres tamaños de paso.', 'Tasa intermedia', 'lenta', 'equilibrada', 'rápida', 'pérdida final:', 'escala log₁₀', 'Una tasa más alta no siempre es mejor: puede acelerar el aprendizaje, pero también provocar exceso o inestabilidad.'],
    ar: ['قارن معدلات التعلّم الثلاثة', 'نفس قيم البداية وثلاثة أحجام مختلفة للخطوة.', 'المعدل المتوسط', 'بطيء', 'متوازن', 'سريع', 'الخسارة النهائية:', 'مقياس لوغاريتمي', 'المعدل الأعلى ليس أفضل دائمًا؛ قد يسرّع التعلّم أو يسبب تجاوزًا وعدم استقرار.'],
    hi: ['तीनों लर्निंग रेट की तुलना करें', 'समान शुरुआती पैरामीटर, तीन अलग-अलग कदम आकार।', 'मध्यम दर', 'धीमा', 'संतुलित', 'तेज़', 'अंतिम लॉस:', 'लॉग₁₀ पैमाना', 'ऊँची दर हमेशा बेहतर नहीं होती; इससे सीखना तेज़ हो सकता है, लेकिन अस्थिरता भी आ सकती है।'],
    tr: ['Üç öğrenme oranını karşılaştır', 'Aynı başlangıç parametreleri, üç farklı adım boyutu.', 'Orta oran', 'yavaş', 'dengeli', 'hızlı', 'son kayıp:', 'log₁₀ ölçeği', 'Daha yüksek oran her zaman daha iyi değildir; öğrenmeyi hızlandırabilir, ancak kararsızlığa da yol açabilir.'],
    pt: ['Compare as três taxas', 'Mesmos parâmetros iniciais, três tamanhos de passo.', 'Taxa intermédia', 'lenta', 'equilibrada', 'rápida', 'perda final:', 'escala log₁₀', 'Uma taxa maior nem sempre é melhor: pode acelerar a aprendizagem, mas também causar excesso ou instabilidade.'],
  }[language]
  const series = useMemo(() => rates.map(rate => ({ rate, history: trainLinear(rate, steps, initial.w, initial.b, initial.x, initial.target) })), [steps, initial])
  const chartData = Array.from({ length: steps + 1 }, (_, step) => Object.fromEntries([
    ['step', step],
    ...series.map(({ rate, history }) => [`loss-${rate}`, history[step] ? Math.log10(Math.max(history[step].loss, 1e-12)) : null]),
  ]))
  const colors = ['#64748b', '#7c3aed', '#ea580c']
  return <Card className="border-slate-200 shadow-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base">{labels[0]}</CardTitle><CardDescription>{labels[1]}</CardDescription></div><Button variant="outline" size="sm" onClick={() => onSelect(.1)}><Gauge data-icon="inline-start" />{labels[2]}</Button></div></CardHeader><CardContent><div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">{series.map(({ rate, history }, i) => <button key={rate} onClick={() => onSelect(rate)} aria-pressed={active === rate} className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${active === rate ? 'border-violet-800 bg-violet-700 text-white' : 'border-slate-200 bg-white text-slate-900 hover:border-violet-300 hover:bg-violet-50'}`}><div className="flex items-center justify-between gap-2"><span className="font-mono font-semibold">η = {rate}</span><Badge variant="outline" className={active === rate ? 'border-white/60 bg-white/15 text-white' : 'border-slate-300 bg-white text-slate-700'}>{labels[3 + i]}</Badge></div><p className={`mt-1 text-xs ${active === rate ? 'text-violet-100' : 'text-slate-700'}`}>{labels[6]} {String(history.at(-1)!.loss)}</p></button>)}</div><div className="min-w-0"><p className="mb-1 text-right text-[11px] text-muted-foreground">{labels[7]}</p><div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="step" type="number" domain={[0, Math.max(1, steps)]} tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} /><YAxis tickLine={false} axisLine={false} fontSize={11} width={42} domain={['auto', 'auto']} ticks={[-12, -9, -6, -3, 0, 3, 6]} tickFormatter={value => `10^${value}`} /><ChartTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} labelFormatter={step => `${t('Étape')} ${step}`} formatter={(value, name) => [Number.isFinite(Number(value)) ? `10^${String(Number(value))}` : '—', String(name).replace('loss-', 'η = ')]} />{series.map(({ rate }, i) => <Line key={rate} type="monotone" dataKey={`loss-${rate}`} name={`η = ${rate}`} stroke={colors[i]} strokeWidth={rate === active ? 3 : 2} dot={false} activeDot={{ r: 4 }} connectNulls />)}</LineChart></ResponsiveContainer></div></div></div><p className="mt-4 text-sm text-muted-foreground">{labels[8]}</p></CardContent></Card>
}

function QuizSection({ onProgress }: { onProgress: (count: number) => void }) {
  const t = useTranslation()
 const [answers, setAnswers] = useState<number[]>([]); useEffect(() => { onProgress(quiz.filter((_, index) => answers[index] !== undefined).length) }, [answers, onProgress]); const score = answers.filter((a, i) => a === quiz[i]?.answer).length; return <section id="quiz" className="scroll-mt-6 space-y-5"><div><Badge className="mb-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t("ÉTAPE FINALE · QUIZ")}</Badge><h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t("Vérifie tes connaissances")}</h2><p className="mt-2 max-w-2xl text-muted-foreground">{t("Cinq questions pour consolider le lien entre les calculs et l’intuition.")}</p></div><div className="grid gap-4">{quiz.map((item, i) => { const selected = answers[i]; const answered = selected !== undefined; return <Card key={item.question} className="border-slate-200 shadow-sm"><CardHeader><div className="flex items-start gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold">{i + 1}</div><CardTitle className="text-base leading-6">{t(item.question)}</CardTitle></div></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 sm:grid-cols-3">{item.options.map((option, oi) => <Button key={option} variant={selected === oi ? (oi === item.answer ? 'default' : 'destructive') : 'outline'} className={`h-auto justify-start whitespace-normal py-3 text-left ${selected === oi ? (oi === item.answer ? 'border-violet-700 bg-violet-700 text-white hover:bg-violet-800' : 'border-rose-700 bg-rose-700 text-white hover:bg-rose-800') : 'border-slate-300 bg-white text-slate-800 hover:border-violet-400 hover:bg-violet-50 hover:text-slate-950'}`} onClick={() => setAnswers(a => { const next = [...a]; next[i] = oi; return next })}>{selected === oi && oi === item.answer && <Check data-icon="inline-start" />}{t(option)}</Button>)}</div>{answered && <p className={`text-sm ${selected === item.answer ? 'text-emerald-700' : 'text-orange-700'}`}>{t(selected === item.answer ? 'Bonne réponse. ' : 'Pas tout à fait. ')}{t(item.explanation)}</p>}</CardContent></Card>})}</div>{quiz.every((_, index) => answers[index] !== undefined) && <Alert className="border-emerald-200 bg-emerald-50"><Trophy className="text-emerald-600" /><AlertDescription><strong>{t("Score : ")}{score} / {quiz.length}.</strong> {t(score >= 4 ? 'Excellent travail, les mécanismes essentiels sont en place.' : 'Relis les étapes puis essaie encore pour consolider les notions.')}</AlertDescription></Alert>}</section> }

const languageLabels = {
  fr: { learn: 'Apprendre', experiment: 'Expérimenter', visualize: 'Visualiser le modèle', quiz: 'Vérifier mes connaissances', journey: 'Parcours', session: 'Session locale', choose: 'Choisir la langue', footer: 'Exécution Python sécurisée par un bac à sable temporaire.' },
  en: { learn: 'Learn', experiment: 'Experiment', visualize: 'Visualize the model', quiz: 'Check my knowledge', journey: 'Learning path', session: 'Local session', choose: 'Choose language', footer: 'Python runs securely in a temporary sandbox.' },
  es: { learn: 'Aprender', experiment: 'Experimentar', visualize: 'Visualizar el modelo', quiz: 'Comprobar mis conocimientos', journey: 'Ruta de aprendizaje', session: 'Sesión local', choose: 'Elegir idioma', footer: 'Python se ejecuta de forma segura en un entorno temporal aislado.' },
  ar: { learn: 'تعلّم', experiment: 'تجربة', visualize: 'تصوّر النموذج', quiz: 'اختبر معرفتك', journey: 'مسار التعلّم', session: 'جلسة محلية', choose: 'اختر اللغة', footer: 'يعمل Python بأمان في بيئة مؤقتة معزولة.' },
  hi: { learn: 'सीखें', experiment: 'प्रयोग करें', visualize: 'मॉडल देखें', quiz: 'ज्ञान जाँचें', journey: 'सीखने की यात्रा', session: 'स्थानीय सत्र', choose: 'भाषा चुनें', footer: 'Python अस्थायी सैंडबॉक्स में सुरक्षित रूप से चलता है।' },
  tr: { learn: 'Öğren', experiment: 'Dene', visualize: 'Modeli görselleştir', quiz: 'Bilgimi kontrol et', journey: 'Öğrenme yolu', session: 'Yerel oturum', choose: 'Dil seç', footer: 'Python geçici bir korumalı alanda güvenle çalışır.' },
  pt: { learn: 'Aprender', experiment: 'Experimentar', visualize: 'Visualizar o modelo', quiz: 'Verificar conhecimentos', journey: 'Percurso', session: 'Sessão local', choose: 'Escolher idioma', footer: 'O Python é executado em segurança numa área temporária isolada.' },
} as const

type Language = keyof typeof languageLabels

export default function Page() {
  const [language, setLanguage] = useState<Language>('fr')
  const t = (text: string) => translate(text, language)
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])
  const labels = languageLabels[language]
  const localizedNav = [
    { label: labels.learn, icon: Network, href: '#learn' },
    { label: labels.experiment, icon: Code2, href: '#experiment' },
    { label: labels.visualize, icon: Activity, href: '#visualize' },
    { label: labels.quiz, icon: CircleHelp, href: '#quiz' },
  ]
  const [history, setHistory] = useState(() => trainLinear(.1, 20))
  const [learningRate, setLearningRate] = useState<number | null>(.1)
  const [manualDone, setManualDone] = useState(false)
  const [active, setActive] = useState('#learn')
  const run = (next: History, nextLearningRate: number | null) => { setHistory(next); setLearningRate(nextLearningRate); setHasRun(true); document.getElementById('visualize')?.scrollIntoView({ behavior: 'smooth' }) }
  const [quizAnswered, setQuizAnswered] = useState(0)
  const [hasRun, setHasRun] = useState(false)
  const progress = (manualDone ? 40 : 0) + (hasRun ? 30 : 0) + quizAnswered * 6
  return <TranslationProvider language={language}><main className="min-h-screen bg-[#f7f9fc] text-slate-950"><header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-8"><a href="#top" className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white shadow-sm"><Sparkles /></div><div><p className="text-sm font-bold tracking-tight">Neural Network</p><p className="text-xs text-violet-600">Learning Lab</p></div></a><div className="flex items-center gap-2"><label className="flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm"><Languages className="size-4 text-violet-600" /><span className="sr-only">{labels.choose}</span><select aria-label={labels.choose} value={language} onChange={event => { const next = event.target.value as Language; setLanguage(next); document.documentElement.lang = next }} className="bg-transparent outline-none"><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option><option value="ar">العربية</option><option value="hi">हिन्दी</option><option value="tr">Türkçe</option><option value="pt">Português</option></select></label><div className="hidden items-center gap-2 md:flex"><Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" />{labels.session}</Badge><div className="flex items-center gap-2 text-xs text-muted-foreground"><Progress value={progress} className="w-20" />{progress}%</div></div></div></div></header><div id="top" className="mx-auto grid max-w-[1500px] lg:grid-cols-[240px_1fr]"><aside className="hidden border-r bg-white/70 px-4 py-7 lg:block"><div className="sticky top-24 space-y-6"><div><p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{labels.journey}</p><nav className="grid gap-1">{localizedNav.map(({ label, icon: Icon, href }) => <a key={href} href={href} onClick={() => setActive(href)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active === href ? 'bg-slate-950 font-medium text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Icon />{t(label)}</a>)}</nav></div><Separator /><div className="rounded-xl bg-violet-50 p-4"><Zap className="mb-3 text-violet-600" /><p className="text-sm font-semibold">{t("Objectif du jour")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("Comprendre comment une erreur devient une mise à jour.")}</p></div></div></aside><div className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-12"><div className="mx-auto max-w-6xl space-y-16"><section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10"><div className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/20 blur-3xl" /><div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-blue-500/15 blur-3xl" /><div className="relative max-w-3xl"><Badge className="mb-5 border-blue-300/30 bg-blue-400/10 text-blue-200 hover:bg-blue-400/10">{t("LABORATOIRE INTERACTIF · 01")}</Badge><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{t("Comprendre comment les modèles apprennent.")}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{t("Une expérience guidée pour passer des équations de rétropropagation à une simulation vivante de descente de gradient.")}</p><div className="mt-7 flex flex-wrap gap-3"><a href="#learn" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-slate-950 shadow-sm transition-colors hover:bg-slate-100">{t("Commencer l’activité")}<ArrowRight /></a><a href="#visualize" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-600 bg-transparent px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800">{t("Voir le modèle en action")}</a></div></div></section><ManualActivity onContinue={() => { setManualDone(true); document.getElementById('experiment')?.scrollIntoView({ behavior: 'smooth' }) }} onRestart={() => { setManualDone(false); setHasRun(false); document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth' }) }} /><Card className="border-violet-200 bg-violet-50 shadow-sm"><CardContent className="grid gap-5 p-6 md:grid-cols-2"><div><div className="mb-3 flex items-center gap-2 text-violet-800"><GitBranch /> <span className="font-semibold">{t("Même mécanisme, autre focale")}</span></div><h3 className="text-lg font-bold leading-snug text-slate-950">{t("De 4 paramètres à 2 paramètres")}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{t("Le premier réseau contient un neurone caché sigmoïde et une sortie linéaire. Ici, un neurone linéaire isole le cœur de la descente de gradient : un poids, un biais et des dérivées directes.")}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border bg-white p-4"><p className="font-semibold text-slate-900">{language === 'fr' ? 'Activité 1' : language === 'en' ? 'Activity 1' : language === 'es' ? 'Actividad 1' : language === 'ar' ? 'النشاط 1' : language === 'hi' ? 'गतिविधि 1' : language === 'tr' ? 'Etkinlik 1' : 'Atividade 1'}</p><p className="mt-2 text-slate-700">{t("1 entrée · sigmoïde cachée")}<br />{t("4 paramètres · chaîne complète")}</p></div><div className="rounded-xl border bg-white p-4"><p className="font-semibold text-slate-900">{language === 'fr' ? 'Activité 2' : language === 'en' ? 'Activity 2' : language === 'es' ? 'Actividad 2' : language === 'ar' ? 'النشاط 2' : language === 'hi' ? 'गतिविधि 2' : language === 'tr' ? 'Etkinlik 2' : 'Atividade 2'}</p><p className="mt-2 text-slate-700">{t("1 neurone linéaire")}<br />{t("2 paramètres · dérivées directes")}</p></div></div></CardContent></Card><CodeLab onRun={run} unlocked={manualDone} language={language} /><TrainingLab history={history} learningRate={learningRate} setLearningRate={v => { setLearningRate(v); setHistory(trainLinear(v, history.length - 1, history[0].w, history[0].b, history[0].x, history[0].target)) }} language={language} /><QuizSection onProgress={setQuizAnswered} /></div></div></div><footer className="border-t bg-white py-8 text-center text-sm text-muted-foreground">Neural Network Learning Lab · {labels.footer}</footer></main></TranslationProvider>
}
