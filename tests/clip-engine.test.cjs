const assert = require('node:assert/strict')
const { test } = require('node:test')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
// Transpile production modules in memory; no test framework/dependency required.
const modules = new Map()
function load(name) {
  const file = path.resolve(__dirname, '../lib/clip', name + '.ts')
  if (modules.has(file)) return modules.get(file).exports
  const module = { exports: {} }; modules.set(file, module)
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require', 'module', 'exports', source)(n => load(n.replace('./', '')), module, module.exports)
  return module.exports
}
const { fmp4Init, fmp4Segment, progressive } = require('./clip-fixtures.cjs')
const { parseMediaPlaylist, selectSegments } = load('m3u8')
const { downloadClip } = load('downloader')
const { boxes, child, view, uint64 } = load('bmff')
const { packageFmp4 } = load('fmp4')
const { parseProgressiveTracks, selectProgressiveSamples } = load('progressive-mp4')
const playlist = '#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:1,\na.m4s\n#EXTINF:1,\nb.m4s\n#EXTINF:1,\nc.m4s\n#EXT-X-ENDLIST\n'
const base = 'https://media.example.test/video/index.m3u8'
const options = (source, extra = {}) => ({ source, startSeconds: 1.2, endSeconds: 2.4, signal: new AbortController().signal, maxBytes: 1024 * 1024, ...extra })

test('HLS selects overlap segments and resolves relative paths', () => {
  const parsed = parseMediaPlaylist(playlist, base), selected = selectSegments(parsed, 1.2, 2.4)
  assert.equal(parsed.init.url, 'https://media.example.test/video/init.mp4')
  assert.deepEqual(selected.map(s => [s.startSeconds, s.endSeconds]), [[1,2],[2,3]])
})
test('HLS supports explicit and same-resource implicit byte ranges', () => {
  const text = '#EXTM3U\n#EXT-X-MAP:URI="all.mp4",BYTERANGE="32@0"\n#EXTINF:1,\n#EXT-X-BYTERANGE:100@32\nall.mp4\n#EXTINF:1,\n#EXT-X-BYTERANGE:100\nall.mp4\n#EXT-X-ENDLIST'
  assert.deepEqual(parseMediaPlaylist(text, base).segments.map(s => s.range), [{start:32,end:131},{start:132,end:231}])
})
test('HLS rejects encrypted, live, missing MAP and invalid range variants', () => {
  for (const value of [playlist.replace('#EXTM3U', '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="secret"'), playlist.replace('#EXT-X-ENDLIST',''), playlist.replace('#EXT-X-MAP:URI="init.mp4"\n',''), playlist.replace('a.m4s','#EXT-X-BYTERANGE:40\na.m4s')]) assert.throws(() => parseMediaPlaylist(value, base))
})
test('fMP4 packaging removes stale prefix, rebases tfdt and sequence', async () => {
  const result = new Uint8Array(await packageFmp4(fmp4Init(), [fmp4Segment(1000),fmp4Segment(2000)], 2).arrayBuffer())
  assert.deepEqual(boxes(result).map(b => b.type), ['ftyp','moov','moof','mdat','moof','mdat'])
  const fragments = boxes(result).filter(b => b.type === 'moof')
  assert.deepEqual(fragments.map(b => uint64(view(result), child(result, child(result,b,'traf'),'tfdt').data + 4)), [0,1000])
  assert.deepEqual(fragments.map(b => view(result).getUint32(child(result,b,'mfhd').data + 4)), [1,2])
})
test('fMP4 rejects absolute offsets and malformed boxes', () => {
  const s = fmp4Segment(), moof = boxes(s).find(b => b.type === 'moof'), tfhd = child(s, child(s,moof,'traf'),'tfhd'); view(s).setUint32(tfhd.data, 1)
  assert.throws(() => packageFmp4(fmp4Init(), [s], 1))
  assert.throws(() => boxes(new Uint8Array([0,0,0,99,109,111,111,118])))
})
test('Progressive parses exact sample offsets and extends to complete GOP', () => {
  const fixture = progressive(), tracks = parseProgressiveTracks(fixture.moov), selected = selectProgressiveSamples(tracks, 3.2, 4.2)
  assert.equal(tracks[0].samples[3].offset, fixture.mediaOffset + 12)
  assert.deepEqual([selected.startSeconds, selected.endSeconds], [2,6])
  assert.deepEqual(selected.tracks[0].samples.map(s => s.offset), [8,12,16,20].map(n => fixture.mediaOffset + n))
})
test('Progressive fetches only selected sample ranges and emits moof/mdat output', async () => {
  const fixture = progressive(), requests = [], original = global.fetch
  global.fetch = async (_url, init) => {
    const match = /^bytes=(\d+)-(\d+)$/.exec(init.headers.Range), start = Number(match[1]), end = Number(match[2]); requests.push([start,end])
    return new Response(fixture.file.subarray(start, end + 1), { status:206, headers:{'content-range':`bytes ${start}-${end}/${fixture.file.length}`} })
  }
  try {
    const result = await downloadClip(options({ mode:'PROGRESSIVE_MP4',url:'https://media.example.test/file.mp4' }, {startSeconds:3.2,endSeconds:4.2}))
    assert.deepEqual([result.startSeconds,result.endSeconds], [2,6])
    assert.deepEqual(requests.at(-1), [fixture.mediaOffset + 8,fixture.mediaOffset + 23])
    const bytes = new Uint8Array(await result.blob.arrayBuffer()), top = boxes(bytes)
    assert.deepEqual(top.map(b=>b.type), ['ftyp','moov','moof','mdat'])
    const mdat = top.at(-1); assert.deepEqual([...bytes.subarray(mdat.data,mdat.end)], Array.from({length:16},(_,i)=>i+8))
  } finally { global.fetch = original }
})
test('HLS downloader selects subset, maintains progress, enforces byte budget', async () => {
  const original = global.fetch, requests = [], progress = []
  global.fetch = async url => { requests.push(String(url)); return new Response(String(url).endsWith('init.mp4') ? fmp4Init() : fmp4Segment(String(url).endsWith('b.m4s') ? 1000 : 2000)) }
  try {
    const source = {mode:'HLS_FMP4',playlist,baseUrl:base}
    const result = await downloadClip(options(source,{onProgress:p=>progress.push(p)}))
    assert.deepEqual([result.startSeconds,result.endSeconds],[1,3]); assert.equal(requests.length,3)
    assert.ok(!requests.some(u=>u.endsWith('/a.m4s')))
    assert.deepEqual(progress.filter(p=>p.phase==='DOWNLOADING').map(p=>p.completed),[1,2])
    await assert.rejects(downloadClip(options(source,{maxBytes:20})), /용량/)
  } finally { global.fetch = original }
})
test('HTTP errors retain numeric status without source URL and cancel pending requests', async () => {
  const original = global.fetch; let canceled = false
  global.fetch = async (url, init) => {
    if (String(url).endsWith('init.mp4')) return new Response(fmp4Init())
    if (String(url).endsWith('b.m4s')) return new Response('',{status:403})
    return await new Promise((_, reject) => init.signal.addEventListener('abort',()=>{canceled=true;reject(new DOMException('Aborted','AbortError'))},{once:true}))
  }
  try { await assert.rejects(downloadClip(options({mode:'HLS_FMP4',playlist,baseUrl:base})), e => e.status===403 && !e.message.includes('https:')); assert.equal(canceled,true) } finally {global.fetch=original}
})
test('Range fallback response rejected before reading a full VOD', async () => {
  const original = global.fetch; global.fetch = async () => new Response(new Uint8Array(100))
  try { await assert.rejects(downloadClip(options({mode:'PROGRESSIVE_MP4',url:'https://media.example.test/file.mp4'})), /Range/) } finally {global.fetch=original}
})
test('Abort before fetch, invalid ranges, safe filename', async () => {
  const controller = new AbortController();controller.abort()
  await assert.rejects(downloadClip(options({mode:'HLS_FMP4',playlist,baseUrl:base},{signal:controller.signal})),e=>e.name==='AbortError')
  await assert.rejects(downloadClip(options({mode:'HLS_FMP4',playlist,baseUrl:base},{endSeconds:700})), /구간/)
  const {buildClipFilename}=load('filename'); assert.equal(buildClipFilename('a/b','c:d\u0000',3661,3671),'ab-cd-01-01-01-10s.mp4')
})

test('CORS-hidden Content-Range accepts only 206 and exactly the requested length', async () => {
  const { readAsset } = load('network')
  const original = global.fetch
  const asset = { url: 'https://media.example.test/file.mp4', range: { start: 100, end: 103 } }
  const context = () => ({ signal: new AbortController().signal, maxBytes: 100, receivedBytes: 0 })
  try {
    global.fetch = async () => new Response(new Uint8Array(4), { status: 206 })
    assert.equal((await readAsset(asset, context())).length, 4)
    global.fetch = async () => new Response(new Uint8Array(5), { status: 206 })
    await assert.rejects(readAsset(asset, context()), /용량/)
    global.fetch = async () => new Response(new Uint8Array(3), { status: 206 })
    await assert.rejects(readAsset(asset, context()), /누락/)
    global.fetch = async () => new Response(new Uint8Array(4), { status: 206, headers: { 'content-range': 'bytes 200-203/1000' } })
    await assert.rejects(readAsset(asset, context()), /Range/)
  } finally { global.fetch = original }
})

test('Progressive applies linear edits and includes AAC roll recovery samples', async () => {
  const fixture = progressive({ editTime: 1000, audioRoll: true })
  const tracks = parseProgressiveTracks(new Uint8Array(fixture.moov))
  assert.equal(tracks[0].samples[0].dts, -1000)
  assert.equal(tracks[1].rollDistance, -1)
  const selected = selectProgressiveSamples(tracks, 3.2, 4.2)
  assert.equal(selected.tracks[0].samples[0].offset, fixture.mediaOffset + 16)
  assert.equal(selected.tracks[1].samples[0].offset, fixture.mediaOffset + 40 + 12)
  assert.deepEqual([selected.startSeconds, selected.endSeconds], [2, 5])
  const original = global.fetch
  global.fetch = async (_url, init) => {
    const [, start, end] = /bytes=(\d+)-(\d+)/.exec(init.headers.Range)
    return new Response(fixture.file.subarray(Number(start), Number(end) + 1), { status: 206 })
  }
  try {
    const output = await downloadClip(options({ mode: 'PROGRESSIVE_MP4', url: 'https://media.example.test/file.mp4' }, { startSeconds: 3.2, endSeconds: 4.2 }))
    const data = new Uint8Array(await output.blob.arrayBuffer())
    const top = boxes(data), moov = top.find(b => b.type === 'moov')
    const audio = boxes(data, moov.data, moov.end).filter(b => b.type === 'trak')[1]
    assert.ok(!boxes(data, audio.data, audio.end).some(b => b.type === 'edts'))
    const stbl = child(data, child(data, child(data, audio, 'mdia'), 'minf'), 'stbl')
    assert.ok(child(data, stbl, 'sgpd'))
    const audioMoof = top.filter(b => b.type === 'moof')[1], traf = child(data, audioMoof, 'traf')
    assert.ok(child(data, traf, 'sbgp'))
  } finally { global.fetch = original }
})

const { progressiveTables } = require('./clip-fixtures.cjs')
const sparseSelection = (data, startSeconds, endSeconds) => selectProgressiveSamples(parseProgressiveTracks(data, { startSeconds, endSeconds }), startSeconds, endSeconds)
const comparableSelection = result => ({ startSeconds: result.startSeconds, endSeconds: result.endSeconds, origin: result.origin, tracks: result.tracks.map(t => ({ id: t.id, samples: t.samples, rollDistance: t.rollDistance })) })

test('Progressive handles late clips in million-sample video and audio without expanding the full tracks', () => {
  const count = 1_000_100, data = progressiveTables({ count, audio: true })
  const start = (Math.floor(count / 2) + (count - 30 - Math.floor(count / 2)) * 2) + 0.2
  const tracks = parseProgressiveTracks(data, { startSeconds: start, endSeconds: start + 2 })
  assert.equal(tracks.length, 2)
  for (const track of tracks) assert.ok(track.samples.length < 100, `retained ${track.samples.length} samples`)
  const result = selectProgressiveSamples(tracks, start, start + 2)
  assert.ok(result.startSeconds <= start)
  assert.ok(result.endSeconds >= start + 2)
  assert.ok(result.tracks[0].samples[0].offset > 4_000_000)
})

test('Progressive sparse variable sizes and 32/64-bit chunk offsets match full parsing across time runs', () => {
  for (const co64 of [false, true]) {
    const data = progressiveTables({ variable: true, co64, audio: true })
    const full = selectProgressiveSamples(parseProgressiveTracks(data), 11.2, 15.2)
    const sparse = sparseSelection(data, 11.2, 15.2)
    assert.deepEqual(comparableSelection(sparse), comparableSelection(full))
    if (co64) assert.ok(sparse.tracks[0].samples[0].offset >= 0x100000000)
  }
})

test('Progressive sparse B-frame composition times, edit offsets and AAC roll match full selection', () => {
  const data = progressiveTables({ variable: true, signedCtts: true, audio: true, editTime: 1000 })
  for (const [start, end] of [[0.2, 2.2], [10.2, 15.2], [25.2, 28.2]]) {
    const full = selectProgressiveSamples(parseProgressiveTracks(data), start, end)
    assert.deepEqual(comparableSelection(sparseSelection(data, start, end)), comparableSelection(full))
  }
  assert.equal(parseProgressiveTracks(data)[0].samples[1].cts, -1000)
})

test('Progressive million-entry variable size table retains exact late sample offsets', () => {
  const count = 1_000_100, data = progressiveTables({ count, variable: true, co64: true })
  const start = 1_500_000.2
  const selected = sparseSelection(data, start, start + 2)
  const sample = selected.tracks[0].samples[0]
  const index = 1_000_020 // last sync sample before start, using the second stts run
  let sizeSum = Math.floor(index / 5) * 25
  for (let i = Math.floor(index / 5) * 5; i < index; i++) sizeSum += 3 + i % 5
  assert.equal(sample.offset, 0x100000000 + sizeSum)
  assert.equal(sample.size, 3 + index % 5)
})

test('Progressive reports empty and malformed sample tables separately from selection limits', () => {
  const message = data => { let caught; try { parseProgressiveTracks(data, { startSeconds: 1, endSeconds: 2 }) } catch (error) { caught = error }; assert.ok(caught, 'must reject malformed table'); return caught.message }
  const empty = message(progressiveTables({ empty: true }))
  const malformed = message(progressiveTables({ variable: true, malformed: true }))
  assert.ok(!empty.includes('지원 범위를 초과'), empty)
  assert.ok(!malformed.includes('지원 범위를 초과'), malformed)
  assert.throws(() => parseProgressiveTracks(progressiveTables({ count: 1_000_100, delta: 1 })), /샘플/)
})

test('Progressive downloads with metadata over 64 MiB using bounded range requests', async () => {
  const fixture = progressive({ metadataPadding: 65 * 1024 * 1024 }), requests = [], original = global.fetch
  global.fetch = async (_url, init) => {
    const [, a, b] = /^bytes=(\d+)-(\d+)$/.exec(init.headers.Range)
    const start = Number(a), end = Number(b); requests.push([start, end])
    return new Response(fixture.file.subarray(start, end + 1), { status: 206 })
  }
  try {
    const result = await downloadClip(options({ mode: 'PROGRESSIVE_MP4', url: 'https://media.example.test/file.mp4' },
      { startSeconds: 3.2, endSeconds: 4.2, maxBytes: 128 * 1024 * 1024 }))
    assert.deepEqual([result.startSeconds, result.endSeconds], [2, 6])
    assert.ok(requests.every(([start, end]) => end - start + 1 <= 4 * 1024 * 1024))
    assert.deepEqual(requests.at(-1), [fixture.mediaOffset + 8, fixture.mediaOffset + 23])
    assert.ok(result.blob.size < 4096)
  } finally { global.fetch = original }
})

test('Progressive rejects metadata above cap before requesting its body', async () => {
  const fixture = progressive(), original = global.fetch
  let requests = 0
  global.fetch = async (_url, init) => {
    requests++
    const [, a, b] = /^bytes=(\d+)-(\d+)$/.exec(init.headers.Range)
    const start = Number(a), end = Number(b)
    const bytes = Buffer.from(fixture.file.subarray(start, end + 1))
    if (bytes.toString('ascii', 4, 8) === 'moov') bytes.writeUInt32BE(128 * 1024 * 1024 + 1)
    return new Response(bytes, { status: 206 })
  }
  try {
    await assert.rejects(downloadClip(options({ mode: 'PROGRESSIVE_MP4', url: 'https://media.example.test/file.mp4' })), /메타데이터가 너무 큽니다/)
    assert.equal(requests, 3)
  } finally { global.fetch = original }
})
