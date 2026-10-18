const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename)
const { selectRendition, createClipSession, getClipSource, ClipSessionError } = require('../lib/clip/session.ts')
const session = { renditions: [
  { id: '1080', height: 1080, mode: 'HLS_FMP4', estimatedBytes: 900 },
  { id: '720', height: 720, mode: 'PROGRESSIVE_MP4', estimatedBytes: 300 },
] }
test('default quality fits the device budget; explicit oversized quality is rejected', () => {
  assert.equal(selectRendition(session, '', 500).id, '720')
  assert.equal(selectRendition(session, '', 1000).id, '1080')
  assert.throws(() => selectRendition(session, '1080', 500))
  assert.throws(() => selectRendition(session, '', 100))
  assert.throws(() => selectRendition({ renditions: [{ id: 'drm', mode: 'DRM' }] }, '', 1000))
})
test('session requests use bounded range data and abort signal, never credentials', async () => {
  const signal = new AbortController().signal
  global.fetch = async (url, init) => {
    assert.ok(url.endsWith('/v1/videos/123/clip-sessions'))
    assert.equal(init.credentials, 'omit')
    assert.equal(init.signal, signal)
    assert.deepEqual(JSON.parse(init.body), { startSeconds: 12, endSeconds: 34 })
    return Response.json({ sessionId: 'opaque', renditions: [] })
  }
  assert.equal((await createClipSession('123', 12, 34, signal)).sessionId, 'opaque')
})
test('expired manifest retains HTTP status and request ID for one-time recovery', async () => {
  global.fetch = async () => Response.json({ message: '세션이 만료되었습니다.', requestId: 'test-request' }, { status: 410 })
  await assert.rejects(getClipSource('session', '720', new AbortController().signal), error =>
    error instanceof ClipSessionError && error.status === 410 && error.requestId === 'test-request')
})

const { isValidClipRange, stepClipTime } = require('../lib/clip/edit-range.ts')
test('edited ranges reject missing, fractional, reversed, excessive and out-of-video values', () => {
  for (const [start, end, duration] of [[NaN, 10, 100], [0, NaN, 100], [-1, 5, 100], [5, 5, 100], [6, 5, 100], [0.5, 2, 100], [0, 601, 1000], [95, 101, 100]]) {
    assert.equal(isValidClipRange(start, end, duration), false)
  }
  assert.equal(isValidClipRange(0, 600, 600), true)
  assert.equal(isValidClipRange(99, 100, 100), true)
  assert.equal(stepClipTime(0, 1, 0, 100), 0)
  assert.equal(stepClipTime(100, -1, 0, 100), 100)
  assert.equal(stepClipTime(50, -1, 0, 100), 51)
  assert.equal(stepClipTime(50, 1, 0, 100), 49)
})

const { formatClipTime, parseClipTime } = require('../lib/clip/edit-range.ts')
test('hour minute second input preserves long videos and rejects malformed times', () => {
  for (const value of [0, 59, 60, 3599, 3600, 42197, 360000]) {
    assert.equal(parseClipTime(formatClipTime(value)), value)
  }
  for (const value of ['', '12', '1:2:3', '00:60:00', '00:00:60', '-1:00:00', '1.5:00:00']) {
    assert.ok(Number.isNaN(parseClipTime(value)))
  }
  assert.equal(isValidClipRange(parseClipTime('01:00:00'), parseClipTime('01:10:00'), 42197), true)
  assert.equal(isValidClipRange(parseClipTime('01:00:00'), parseClipTime('01:10:01'), 42197), false)
})
