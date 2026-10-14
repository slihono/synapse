import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { readHistory } from '../lib/python-report.ts'

function createRoute(report = { stdout: '4\n', stderr: '', failed: false, history: [] }) {
  let stopped = 0
  const sandbox = {
    writeFiles: async () => {},
    runCommand: async () => ({ exitCode: 0, stdout: async () => JSON.stringify(report) }),
    stop: async () => { stopped++ },
  }
  const source = readFileSync(new URL('../app/api/python/route.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@vercel/sandbox') return { Sandbox: { create: async () => sandbox } }
    if (name === '@/lib/python-report') return { readHistory }
    throw new Error(`Unexpected import: ${name}`)
  }, module, module.exports)
  return { post: module.exports.POST, stopped: () => stopped }
}

function request(payload, ip = 'test-client') {
  return new Request('https://example.test/api/python', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': ip },
    body: JSON.stringify(payload),
  })
}

test('API rejects malformed requests before starting a sandbox', async () => {
  const route = createRoute()
  assert.equal((await route.post(request(null))).status, 400)
  assert.equal((await route.post(request({ code: '' }))).status, 400)
  assert.equal((await route.post(request({ code: 'a'.repeat(30001) }))).status, 413)
  assert.equal(route.stopped(), 0)
})

test('Unicode code is limited by characters rather than an ASCII byte budget', async () => {
  const route = createRoute()
  const response = await route.post(request({ code: '# ' + 'é'.repeat(29998) }))
  assert.equal(response.status, 200)
  assert.equal(route.stopped(), 1)
})

test('rate limit returns a retry hint', async () => {
  const route = createRoute()
  for (let i = 0; i < 8; i++) await route.post(request({ code: '' }))
  const response = await route.post(request({ code: '' }))
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '60')
})

test('capacity rejects a new client while allowing an existing client', async () => {
  const route = createRoute()
  for (let i = 0; i < 1000; i++) await route.post(request({ code: '' }, `client-${i}`))
  assert.equal((await route.post(request({ code: '' }, 'new-client'))).status, 503)
  assert.equal((await route.post(request({ code: '' }, 'client-0'))).status, 400)
})

test('API limits untrusted reports and always releases the sandbox', async () => {
  const route = createRoute({ stdout: 'a'.repeat(17000), stderr: '', failed: false, history: [null, {}] })
  const response = await route.post(request({ code: 'print(4)' }))
  const report = await response.json()
  assert.equal(report.stdout.length, 16000)
  assert.equal(report.truncated, true)
  assert.deepEqual(report.history, [])
  assert.equal(route.stopped(), 1)
})

test('API validates runtime parameter metadata', async () => {
  const route = createRoute({ stdout: '', stderr: '', failed: false, history: [], learningRate: .2, trainingSteps: 100 })
  const report = await (await route.post(request({ code: 'print(4)' }))).json()
  assert.equal(report.learningRate, .2)
  assert.equal(report.trainingSteps, 100)
  const invalid = createRoute({ stdout: '', stderr: '', failed: false, history: [], learningRate: '0.2', trainingSteps: -1 })
  const bad = await (await invalid.post(request({ code: 'print(4)' }))).json()
  assert.equal(bad.learningRate, null)
  assert.equal(bad.trainingSteps, null)
})
