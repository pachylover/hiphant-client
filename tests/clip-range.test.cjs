const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

// Compile the actual utilities without adding a runtime dependency or changing the app build.
const originalTs = require.extensions['.ts']
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename)
}
const { normalizeClipRange, normalizeHighlights } = require('../lib/highlights.ts')
if (originalTs) require.extensions['.ts'] = originalTs
else delete require.extensions['.ts']

for (const [name, input, expected] of [
  ['millisecond rounding', { start: 431263, end: 551263 }, [431, 552, 'api-range']],
  ['start fallback', { minute: 1000 }, [0, 91, 'minute-fallback']],
  ['video end', { start: 99000, end: 120000, videoDuration: 100 }, [99, 100, 'api-range']],
  ['range past end', { start: 200000, end: 300000, videoDuration: 100 }, [99, 100, 'api-range']],
  ['legacy fallback', { minute: 461263 }, [431, 552, 'minute-fallback']],
  ['invalid range fallback', { start: 5000, end: 1000, minute: 40000 }, [10, 130, 'minute-fallback']],
  ['ten minute cap', { start: 10000, end: 900000 }, [10, 610, 'api-range']],
  ['unknown duration', { minute: 30000, videoDuration: 0 }, [0, 120, 'minute-fallback']],
  ['one second video', { minute: 99999, videoDuration: 1 }, [0, 1, 'minute-fallback']],
]) {
  test(name, () => {
    const actual = normalizeClipRange({ videoId: 'route-id', ...input })
    assert.deepEqual([actual.startSeconds, actual.endSeconds, actual.source], expected)
    assert.equal(actual.durationSeconds, expected[1] - expected[0])
  })
}


test('existing keyword rows display the count and keyword title', () => {
  const [row] = normalizeHighlights('123', { duration: 1000 }, [{ id: 1, highlightType: 'KEYWORD', keyword: '레전드', chatCount: 18, title: 'old title', minute: 120000 }])
  assert.equal(row.title, '18개의 레전드 채팅이 발생한 구간')
})
