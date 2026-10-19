const assert = require('node:assert/strict')
const { test } = require('node:test')
const { readFileSync } = require('node:fs')
const path = require('node:path'), ts = require('typescript'), modules = new Map()
function load(name) {
 const file = path.resolve(__dirname, '../lib/clip', name + '.ts')
 if (modules.has(file)) return modules.get(file).exports
 const module = { exports: {} }; modules.set(file, module)
 const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS } }).outputText
 new Function('require','module','exports',source)(n => load(n.replace('./','')),module,module.exports)
 return module.exports
}
const { parseMediaPlaylist, selectSegments } = load('m3u8'), { downloadClip } = load('downloader')
const { fmp4Init, fmp4Segment } = require('./clip-fixtures.cjs')
const base = 'https://media.example.test/video/index.m3u8'
const text = '#EXTM3U\n#EXT-X-MAP:URI="first.mp4"\n#EXTINF:2,\na.m4v\n#EXT-X-DISCONTINUITY\n#EXT-X-MAP:URI="second.mp4"\n#EXTINF:2,\nb.m4v\n#EXTINF:2,\nc.m4v\n#EXT-X-ENDLIST\n'
test('HLS keeps per-period init and accepts leading discontinuity', () => {
 const parsed = parseMediaPlaylist(text.replace('#EXTM3U','#EXTM3U\n#EXT-X-DISCONTINUITY'),base)
 const first = selectSegments(parsed,0,2), second = selectSegments(parsed,2,6)
 assert.equal(first[0].init.url,new URL('first.mp4',base).href)
 assert.equal(second[0].init.url,new URL('second.mp4',base).href)
 assert.equal(second[0].init,second[1].init)
 assert.notEqual(first[0].period,second[0].period)
})
test('HLS rejects only selection crossing discontinuity or init change', () => {
 for (const value of [text,text.replace('#EXT-X-DISCONTINUITY\n',''),text.replace('#EXT-X-MAP:URI="second.mp4"\n','')]) {
  const parsed = parseMediaPlaylist(value,base)
  assert.throws(() => selectSegments(parsed,1.9,2.1),/영상 연결 지점/)
  assert.equal(selectSegments(parsed,2,4).length,1)
  assert.equal(selectSegments(parsed,0,2).length,1)
 }
})
test('HLS MAP range changes create period but identical repeated MAP does not', () => {
 const parsed = parseMediaPlaylist(text.replace('URI="first.mp4"','URI="all.mp4",BYTERANGE="100@0"').replace('#EXT-X-DISCONTINUITY\n','').replace('URI="second.mp4"','URI="all.mp4",BYTERANGE="100@100"'),base)
 assert.throws(() => selectSegments(parsed,1,3),/영상 연결 지점/)
 assert.deepEqual(selectSegments(parsed,2,4)[0].init.range,{start:100,end:199})
 assert.equal(selectSegments(parseMediaPlaylist(text.replace('#EXT-X-DISCONTINUITY\n','').replace('second.mp4','first.mp4'),base),1,3).length,2)
})
test('HLS retains encrypted and split-track rejection', () => {
 for (const tag of ['#EXT-X-KEY:METHOD=AES-128,URI="key"','#EXT-X-MEDIA:TYPE=AUDIO','#EXT-X-GAP']) assert.throws(() => parseMediaPlaylist(text.replace('#EXTM3U','#EXTM3U\n'+tag),base))
})
test('HLS download uses selected period init and rejects crossing before fetching', async () => {
 const requests = [], original = global.fetch
 global.fetch = async url => {
  const name = new URL(url).pathname.split('/').at(-1); requests.push(name)
  return new Response(name === 'second.mp4' ? fmp4Init() : fmp4Segment(name === 'b.m4v' ? 5000 : 6000))
 }
 const options = { source:{mode:'HLS_FMP4',playlist:text,baseUrl:base},startSeconds:2,endSeconds:6,signal:new AbortController().signal,maxBytes:1024*1024 }
 try {
  const result = await downloadClip(options)
  assert.deepEqual(requests,['second.mp4','b.m4v','c.m4v']); assert.ok(result.blob.size > 0)
  requests.length = 0
  await assert.rejects(downloadClip({...options,startSeconds:1}),/영상 연결 지점/)
  assert.equal(requests.length,0)
 } finally { global.fetch = original }
})

test('HLS accepts exactly 16 MiB and distinguishes byte limit from invalid format', () => {
 const limit = 16 * 1024 * 1024
 const boundary = text + '#' + 'x'.repeat(limit - Buffer.byteLength(text) - 1)
 assert.equal(Buffer.byteLength(boundary), limit)
 assert.equal(parseMediaPlaylist(boundary, base).segments.length, 3)
 assert.throws(() => parseMediaPlaylist(boundary + 'x', base), /지원 용량/)
 const unicode = text + '#' + '가'.repeat(Math.ceil(limit / 3))
 assert.ok(unicode.length < limit)
 assert.throws(() => parseMediaPlaylist(unicode, base), /지원 용량/)
 assert.throws(() => parseMediaPlaylist('<html>invalid</html>', base), /올바른 HLS 목록이 아닙니다/)
})

test('HLS downloads a short range from a long playlist exceeding the old 2 MiB cap', async () => {
 const count = 20_000
 const longPlaylist = '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n' +
  Array.from({length: count}, (_, i) => `#EXTINF:2,\n${'segment-'.repeat(12)}${i}.m4s\n`).join('') + '#EXT-X-ENDLIST\n'
 assert.ok(Buffer.byteLength(longPlaylist) > 2 * 1024 * 1024)
 const original = global.fetch, requests = []
 global.fetch = async url => {
  requests.push(String(url))
  return new Response(String(url).endsWith('init.mp4') ? fmp4Init() : fmp4Segment(2000))
 }
 try {
  const result = await downloadClip({source:{mode:'HLS_FMP4',playlist:longPlaylist,baseUrl:base},
   startSeconds:2,endSeconds:4,signal:new AbortController().signal,maxBytes:1024*1024})
  assert.deepEqual([result.startSeconds,result.endSeconds],[2,4])
  assert.ok(result.blob.size > 0)
  assert.equal(requests.length,2)
  assert.ok(requests[0].endsWith('/init.mp4'))
  assert.ok(requests[1].endsWith('segment-1.m4s'))
 } finally { global.fetch = original }
})
