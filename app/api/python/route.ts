import { Sandbox } from '@vercel/sandbox'
import { readHistory } from '@/lib/python-report'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_CODE_LENGTH = 30_000
const MAX_OUTPUT_LENGTH = 16_000
const MAX_REQUEST_BYTES = MAX_CODE_LENGTH * 6 + 100

const runner = String.raw`import ast
import contextlib
import io
import json
import math
import os
import sys
import traceback

MAX_OUTPUT = 16000
MAX_POINTS = 501
failed = False

class BoundedOutput(io.TextIOBase):
    def __init__(self, limit):
        self.limit = limit
        self.parts = []
        self.size = 0
        self.truncated = False
    def write(self, value):
        text = str(value)
        remaining = self.limit - self.size
        if remaining > 0:
            part = text[:remaining]
            self.parts.append(part)
            self.size += len(part)
        if len(text) > remaining:
            self.truncated = True
        return len(text)
    def flush(self):
        pass
    def getvalue(self):
        return ''.join(self.parts)

with open('/vercel/sandbox/user_code.py', encoding='utf-8') as script_file:
    source = script_file.read()
stdout = BoundedOutput(MAX_OUTPUT)
stderr = BoundedOutput(4000)
saved_stdout = os.dup(1)
saved_stderr = os.dup(2)
null_fd = os.open(os.devnull, os.O_WRONLY)
os.dup2(null_fd, 1)
os.dup2(null_fd, 2)
points = []
last = None
filename = '<synapse-user-code>'
namespace = {'__name__': '__main__', '__file__': filename}

def finite_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def capture_state(values):
    global last
    try:
        names = ('x', 'y', 'w', 'b')
        if all(name in values and finite_number(values[name]) for name in names):
            x, y, w, b = (float(values[name]) for name in names)
            marker = (x, y, w, b)
            if marker != last and len(points) < MAX_POINTS:
                prediction = w * x + b
                error = prediction - y
                loss = 0.5 * error * error
                grad_w = error * x
                if all(math.isfinite(value) for value in (prediction, error, loss, grad_w)):
                    step = len(points)
                    points.append({'step': step, 'x': x, 'target': y, 'w': w, 'b': b,
                        'prediction': prediction, 'loss': loss, 'gradW': grad_w, 'gradB': error})
                    last = marker
    except (OverflowError, ValueError):
        pass

class TrainingCapture(ast.NodeTransformer):
    def visit_loop(self, node):
        self.generic_visit(node)
        snapshot = ast.parse('__synapse_capture__(locals())').body[0]
        node.body.append(ast.copy_location(snapshot, node))
        initial = ast.copy_location(ast.parse('__synapse_capture__(locals())').body[0], node)
        return [initial, node]
    visit_For = visit_loop
    visit_While = visit_loop

namespace['__synapse_capture__'] = capture_state

try:
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        tree = TrainingCapture().visit(ast.parse(source, filename=filename))
        ast.fix_missing_locations(tree)
        exec(compile(tree, filename, 'exec'), namespace, namespace)
        capture_state(namespace)
except BaseException:
    failed = True
    traceback.print_exc(file=stderr)

os.dup2(saved_stdout, 1)
os.dup2(saved_stderr, 2)
os.close(saved_stdout)
os.close(saved_stderr)
os.close(null_fd)
print(json.dumps({'stdout': stdout.getvalue(), 'stderr': stderr.getvalue(),
    'truncated': stdout.truncated or stderr.truncated, 'failed': failed,
    'history': points}, allow_nan=False, ensure_ascii=False))
`

const requestsByIp = new Map<string, number[]>()
const REQUESTS_PER_MINUTE = 8

export async function POST(request: Request) {
  const forwardedIp = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown'
  const clientIp = forwardedIp.split(',')[0].trim().slice(0, 80) || 'unknown'
  const now = Date.now()
  const recentRequests = (requestsByIp.get(clientIp) ?? []).filter(timestamp => now - timestamp < 60_000)
  if (recentRequests.length >= REQUESTS_PER_MINUTE) {
    return Response.json({ error: 'Trop d’exécutions. Réessaie dans une minute.' }, { status: 429, headers: { 'Retry-After': '60' } })
  }
  if (requestsByIp.size >= 1000) {
    for (const [ip, timestamps] of requestsByIp) {
      if (!timestamps.some(timestamp => now - timestamp < 60_000)) requestsByIp.delete(ip)
    }
  }
  if (requestsByIp.size >= 1000 && !requestsByIp.has(clientIp)) {
    return Response.json({ error: 'Service momentanément occupé. Réessaie plus tard.' }, { status: 503 })
  }
  recentRequests.push(now)
  requestsByIp.set(clientIp, recentRequests)

  let payload: unknown
  try {
    const reader = request.body?.getReader()
    if (!reader) return Response.json({ error: 'Requête vide.' }, { status: 400 })
    const decoder = new TextDecoder()
    let text = ''
    let bytesRead = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > MAX_REQUEST_BYTES) {
        await reader.cancel()
        return Response.json({ error: 'Le code dépasse la limite de 30 000 caractères.' }, { status: 413 })
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    payload = JSON.parse(text)
  } catch {
    return Response.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const code = (payload as { code?: unknown })?.code
  if (typeof code !== 'string' || !code.trim()) {
    return Response.json({ error: 'Saisis un programme Python avant de l’exécuter.' }, { status: 400 })
  }
  if (code.length > MAX_CODE_LENGTH) {
    return Response.json({ error: 'Le code dépasse la limite de 30 000 caractères.' }, { status: 413 })
  }

  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | undefined
  try {
    sandbox = await Sandbox.create({
      resources: { vcpus: 1 },
      timeout: 20_000,
      persistent: false,
      networkPolicy: 'deny-all',
    })
    await sandbox.writeFiles([
      { path: '/vercel/sandbox/runner.py', content: Buffer.from(runner) },
      { path: '/vercel/sandbox/user_code.py', content: Buffer.from(code) },
    ])
    const result = await sandbox.runCommand({
      cmd: 'python3',
      args: ['-I', '/vercel/sandbox/runner.py'],
      cwd: '/vercel/sandbox',
      timeoutMs: 12_000,
    })
    const raw = await result.stdout()
    if (result.exitCode !== 0 || raw.length > 1_000_000) throw new Error('Invalid Python runner output')
    const report = JSON.parse(raw) as {
      stdout: string
      stderr: string
      truncated: boolean
      history: unknown[]
      failed: boolean
    }
    if (!report || typeof report.stdout !== 'string' || typeof report.stderr !== 'string') throw new Error('Invalid Python report')
    return Response.json({
      stdout: report.stdout.slice(0, MAX_OUTPUT_LENGTH),
      stderr: report.stderr.slice(0, 4000),
      truncated: Boolean(report.truncated) || report.stdout.length > MAX_OUTPUT_LENGTH || report.stderr.length > 4000,
      failed: Boolean(report.failed),
      history: readHistory(report.history),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : ''
    const timedOut = /timed?\s*out|timeout|expired/i.test(detail)
    return Response.json({
      error: timedOut
        ? 'Temps limite atteint (12 s). Réduis la charge de calcul et réessaie.'
        : 'Impossible de lancer le bac à sable Python. Réessaie dans un instant.',
    }, { status: timedOut ? 408 : 503 })
  } finally {
    await sandbox?.stop().catch(() => undefined)
  }
}
