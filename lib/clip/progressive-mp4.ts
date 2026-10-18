import { Box, box, boxes, child, concat, duration, fullBox, raw, trackInfo, uint64, view, words, write64 } from "./bmff"
import { concurrentMap, DownloadContext, readAsset } from "./network"

interface Sample { offset: number; size: number; dts: number; duration: number; cts: number; sync: boolean }
interface Track { id: number; timescale: number; handler: string; trak: Box; samples: Sample[]; rollDistance?: number; groupDescription?: Uint8Array; groupType?: Uint8Array }
const METADATA_LIMIT = 32 * 1024 * 1024
const SAMPLE_LIMIT = 1_000_000

/** Map a single continuous media edit (optionally preceded by an empty delay)
 * to movie presentation time. Repeated edits and speed changes need remux logic
 * beyond a range download and are deliberately rejected. */
function presentationOffset(data: Uint8Array, trak: Box, timescale: number, movieScale: number): number {
  const edts = boxes(data, trak.data, trak.end).find(b => b.type === "edts")
  if (!edts) return 0
  const elst = child(data, edts, "elst"), v = view(data), version = data[elst.data]
  if (version > 1 || !movieScale) throw new Error("지원하지 않는 MP4 편집 시간입니다.")
  const count = v.getUint32(elst.data + 4), width = version === 1 ? 20 : 12
  if (count < 1 || count > 2 || elst.data + 8 + count * width > elst.end) throw new Error("반복 편집된 MP4는 지원하지 않습니다.")
  let delay = 0, mediaTime: number | undefined
  for (let i = 0; i < count; i++) {
    const p = elst.data + 8 + i * width
    const span = version === 1 ? uint64(v, p) : v.getUint32(p)
    const empty = version === 1 ? v.getInt32(p + 8) === -1 && v.getUint32(p + 12) === 0xffffffff : v.getInt32(p + 4) === -1
    const time = empty ? -1 : version === 1 ? uint64(v, p + 8) : v.getInt32(p + 4)
    const rate = p + (version === 1 ? 16 : 8)
    if (!span || v.getInt16(rate) !== 1 || v.getInt16(rate + 2) !== 0) throw new Error("속도가 변경된 MP4는 지원하지 않습니다.")
    if (time === -1 && i === 0 && count === 2) delay = span / movieScale
    else if (time >= 0 && i === count - 1) mediaTime = time
    else throw new Error("반복 편집된 MP4는 지원하지 않습니다.")
  }
  if (mediaTime === undefined) throw new Error("MP4 편집 구간에 미디어가 없습니다.")
  return Math.round(delay * timescale) - mediaTime
}

async function readMetadata(url: string, context: DownloadContext) {
  let position = 0, ftyp: Uint8Array | undefined, moov: Uint8Array | undefined
  for (let count = 0; count < 100 && !moov; count++) {
    const header = await readAsset({ url, range: { start: position, end: position + 15 } }, context, 16), v = view(header)
    const type = String.fromCharCode(...header.subarray(4, 8)), shortSize = v.getUint32(0), size = shortSize === 1 ? uint64(v, 8) : shortSize
    if (size < (shortSize === 1 ? 16 : 8) || !Number.isSafeInteger(position + size)) throw new Error("지원하지 않는 MP4 파일 구조입니다.")
    if (type === "ftyp" || type === "moov") {
      if (size > METADATA_LIMIT) throw new Error("영상 메타데이터가 너무 큽니다.")
      const data = await readAsset({ url, range: { start: position, end: position + size - 1 } }, context, METADATA_LIMIT)
      if (type === "ftyp") ftyp = data; else moov = data
    }
    position += size
  }
  if (!ftyp || !moov) throw new Error("MP4 메타데이터를 찾을 수 없습니다.")
  return { ftyp, moov }
}

export function parseProgressiveTracks(data: Uint8Array): Track[] {
  const moov = boxes(data).find(b => b.type === "moov")
  if (!moov || boxes(data, moov.data, moov.end).some(b => b.type === "mvex")) throw new Error("Progressive MP4 형식이 아닙니다.")
  const v = view(data), tracks: Track[] = []
  const mvhd = child(data, moov, "mvhd")
  const movieScale = v.getUint32(mvhd.data + (data[mvhd.data] === 1 ? 20 : 12))
  for (const trak of boxes(data, moov.data, moov.end).filter(b => b.type === "trak")) {
    const info = trackInfo(data, trak), hdlr = child(data, info.mdia, "hdlr"), handler = String.fromCharCode(...data.subarray(hdlr.data + 8, hdlr.data + 12))
    if (!["vide", "soun"].includes(handler)) throw new Error("영상·오디오 외 트랙이 있는 MP4는 지원하지 않습니다.")
    if (!info.timescale) throw new Error("잘못된 영상 시간 단위입니다.")
    const timelineOffset = presentationOffset(data, trak, info.timescale, movieScale)
    const stbl = child(data, child(data, info.mdia, "minf"), "stbl"), tables = boxes(data, stbl.data, stbl.end), stsd = child(data, stbl, "stsd")
    if (v.getUint32(stsd.data + 4) !== 1) throw new Error("여러 코덱 설명을 사용하는 MP4는 지원하지 않습니다.")
    const entries = boxes(data, stsd.data + 8, stsd.end)
    if (entries.length !== 1 || !["avc1", "avc3", "hvc1", "hev1", "mp4a"].includes(entries[0].type)) throw new Error("지원하지 않는 코덱 또는 암호화 영상입니다.")
    if (tables.some(b => ["senc", "saiz", "saio"].includes(b.type))) throw new Error("암호화 MP4는 지원하지 않습니다.")
    const stsz = child(data, stbl, "stsz"), defaultSize = v.getUint32(stsz.data + 4), count = v.getUint32(stsz.data + 8)
    if (!count || count > SAMPLE_LIMIT || !defaultSize && stsz.data + 12 + count * 4 > stsz.end) throw new Error("영상 샘플 수가 지원 범위를 초과합니다.")
    const groups = tables.filter(b => b.type === "sgpd" || b.type === "sbgp")
    let rollDistance: number | undefined, groupDescription: Uint8Array | undefined, groupType: Uint8Array | undefined
    if (groups.length) {
      const sgpd = groups.find(b => b.type === "sgpd"), sbgp = groups.find(b => b.type === "sbgp")
      // Common AAC roll recovery: one description applies uniformly. Preserve
      // the grouping in the output and fetch its decoder pre-roll samples.
      if (handler !== "soun" || groups.length !== 2 || !sgpd || !sbgp
        || sgpd.end - sgpd.data !== 18 || sbgp.end - sbgp.data !== 20
        || data[sgpd.data] !== 1 || data[sbgp.data] !== 0
        || !["roll", "prol"].includes(String.fromCharCode(...data.subarray(sgpd.data + 4, sgpd.data + 8)))
        || v.getUint32(sgpd.data + 4) !== v.getUint32(sbgp.data + 4)
        || v.getUint32(sgpd.data + 8) !== 2 || v.getUint32(sgpd.data + 12) !== 1
        || v.getUint32(sbgp.data + 8) !== 1 || v.getUint32(sbgp.data + 12) !== count || v.getUint32(sbgp.data + 16) !== 1) {
        throw new Error("지원하지 않는 MP4 샘플 그룹입니다.")
      }
      rollDistance = v.getInt16(sgpd.data + 16)
      if (rollDistance > 0 || rollDistance < -32) throw new Error("지원하지 않는 오디오 복구 구간입니다.")
      groupDescription = raw(data, sgpd)
      groupType = data.slice(sgpd.data + 4, sgpd.data + 8)
    }
    const samples: Sample[] = Array.from({ length: count }, (_, i) => ({ offset: 0, size: defaultSize || v.getUint32(stsz.data + 12 + i * 4), dts: 0, duration: 0, cts: 0, sync: true }))
    const expand = (table: Box, apply: (s: Sample, value: number) => void, signed = false) => {
      const entries = v.getUint32(table.data + 4); let index = 0
      if (table.data + 8 + entries * 8 > table.end) throw new Error("잘못된 MP4 시간 표입니다.")
      for (let n = 0; n < entries; n++) {
        const p = table.data + 8 + n * 8, repeat = v.getUint32(p), value = signed ? v.getInt32(p + 4) : v.getUint32(p + 4)
        if (index + repeat > count) throw new Error("잘못된 MP4 샘플 표입니다.")
        for (let j = 0; j < repeat; j++) apply(samples[index++], value)
      }
      if (index !== count) throw new Error("MP4 샘플 정보가 누락되었습니다.")
    }
    let dts = timelineOffset
    expand(child(data, stbl, "stts"), (sample, value) => { if (!value) throw new Error("잘못된 샘플 길이입니다."); sample.dts = dts; sample.duration = value; dts += value })
    const ctts = tables.find(b => b.type === "ctts")
    if (ctts) expand(ctts, (s, value) => { s.cts = value }, data[ctts.data] === 1)
    const stss = tables.find(b => b.type === "stss")
    if (stss) {
      samples.forEach(s => { s.sync = false }); const n = v.getUint32(stss.data + 4)
      if (stss.data + 8 + n * 4 > stss.end) throw new Error("잘못된 키프레임 표입니다.")
      for (let i = 0; i < n; i++) { const index = v.getUint32(stss.data + 8 + i * 4) - 1; if (!samples[index]) throw new Error("잘못된 키프레임 위치입니다."); samples[index].sync = true }
    }
    const offsets = tables.find(b => b.type === "stco" || b.type === "co64"), stsc = child(data, stbl, "stsc")
    if (!offsets) throw new Error("MP4 데이터 위치가 없습니다.")
    const chunkCount = v.getUint32(offsets.data + 4), width = offsets.type === "co64" ? 8 : 4, mappingCount = v.getUint32(stsc.data + 4)
    if (!mappingCount || stsc.data + 8 + mappingCount * 12 > stsc.end || offsets.data + 8 + chunkCount * width > offsets.end) throw new Error("잘못된 MP4 데이터 위치 표입니다.")
    const mapping = Array.from({ length: mappingCount }, (_, i) => { const p = stsc.data + 8 + i * 12; return { first: v.getUint32(p), count: v.getUint32(p + 4), description: v.getUint32(p + 8) } })
    if (mapping[0].first !== 1 || mapping.some((m, i) => !m.count || m.description !== 1 || i > 0 && m.first <= mapping[i - 1].first)) throw new Error("지원하지 않는 MP4 청크 표입니다.")
    let sampleIndex = 0, mappingIndex = 0
    for (let chunk = 1; chunk <= chunkCount; chunk++) {
      while (mappingIndex + 1 < mapping.length && mapping[mappingIndex + 1].first <= chunk) mappingIndex++
      const p = offsets.data + 8 + (chunk - 1) * width; let offset = width === 8 ? uint64(v, p) : v.getUint32(p)
      for (let j = 0; j < mapping[mappingIndex].count; j++) {
        const sample = samples[sampleIndex++]; if (!sample || !sample.size || !Number.isSafeInteger(offset + sample.size)) throw new Error("잘못된 MP4 샘플 위치입니다.")
        sample.offset = offset; offset += sample.size
      }
    }
    if (sampleIndex !== count) throw new Error("MP4 샘플 위치가 누락되었습니다.")
    tracks.push({ id: info.id, timescale: info.timescale, handler, trak, samples, rollDistance, groupDescription, groupType })
  }
  if (!tracks.length || tracks.filter(t => t.handler === "vide").length !== 1 || tracks.filter(t => t.handler === "soun").length > 1) throw new Error("단일 영상 및 오디오 트랙만 지원합니다.")
  return tracks
}

export function selectProgressiveSamples(tracks: Track[], start: number, end: number) {
  const video = tracks.find(t => t.handler === "vide")!, scale = video.timescale
  let first = -1
  for (let i = 0; i < video.samples.length; i++) { const s = video.samples[i]; if (s.sync && (s.dts + s.cts) / scale <= start) first = i }
  if (first < 0) throw new Error("요청 구간 앞의 키프레임을 찾을 수 없습니다.")
  // Include a complete GOP so B-frames never reference a discarded future frame.
  let last = video.samples.findIndex((s, i) => i > first && s.sync && (s.dts + s.cts) / scale >= end)
  if (last < 0) last = video.samples.length
  const selectedVideo = video.samples.slice(first, last)
  const actualStart = selectedVideo.reduce((n, s) => Math.min(n, (s.dts + s.cts) / scale), Infinity)
  const actualEnd = selectedVideo.reduce((n, s) => Math.max(n, (s.dts + s.cts + s.duration) / scale), 0)
  if (actualEnd + 0.001 < end) throw new Error("요청 구간이 영상 끝을 초과합니다.")
  const selected = tracks.map(t => {
    if (t === video) return { ...t, samples: selectedVideo }
    const first = t.samples.findIndex(s => (s.dts + s.cts + s.duration) / t.timescale > actualStart)
    const after = t.samples.findIndex(s => (s.dts + s.cts) / t.timescale >= actualEnd)
    return { ...t, samples: first < 0 ? [] : t.samples.slice(Math.max(0, first + (t.rollDistance ?? 0)), after < 0 ? t.samples.length : after) }
  })
  if (selected.some(t => !t.samples.length)) throw new Error("요청 구간의 오디오 또는 영상 샘플이 없습니다.")
  const origin = Math.min(...selected.map(t => t.samples[0].dts / t.timescale))
  const outputStart = selected.reduce((n, t) => t.samples.reduce((m, s) => Math.min(m, (s.dts + s.cts) / t.timescale), n), Infinity)
  const outputEnd = selected.reduce((n, t) => t.samples.reduce((m, s) => Math.max(m, (s.dts + s.cts + s.duration) / t.timescale), n), 0)
  if (outputEnd - outputStart > 600) throw new Error("키프레임 경계 보정 후 길이가 10분을 초과합니다. 요청 구간을 줄여주세요.")
  return { tracks: selected, startSeconds: outputStart, endSeconds: outputEnd, origin }
}

function fragmentedInit(ftyp: Uint8Array, data: Uint8Array, tracks: Track[], seconds: number): Uint8Array {
  const moov = boxes(data)[0], mvhd = child(data, moov, "mvhd"), movieScale = view(data).getUint32(mvhd.data + (data[mvhd.data] === 1 ? 20 : 12))
  const changed = data.slice(); duration(changed, mvhd, Math.round(seconds * movieScale))
  const rebuilt = tracks.map(t => {
    const info = trackInfo(changed, t.trak); duration(changed, info.tkhd, Math.round(seconds * movieScale)); duration(changed, info.mdhd, Math.round(seconds * t.timescale))
    const minf = child(data, info.mdia, "minf"), stbl = child(data, minf, "stbl")
    const empty = box("stbl", raw(data, child(data, stbl, "stsd")), fullBox("stts", 0, words(0)), fullBox("stsc", 0, words(0)), fullBox("stsz", 0, words(0, 0)), fullBox("stco", 0, words(0)), ...(t.groupDescription ? [t.groupDescription] : []))
    const newMinf = box("minf", ...boxes(data, minf.data, minf.end).map(b => b.type === "stbl" ? empty : raw(data, b)))
    const newMdia = box("mdia", ...boxes(data, info.mdia.data, info.mdia.end).map(b => b.type === "minf" ? newMinf : raw(changed, b)))
    return box("trak", ...boxes(data, t.trak.data, t.trak.end).filter(b => b.type !== "edts").map(b => b.type === "mdia" ? newMdia : raw(changed, b)))
  })
  return concat([ftyp, box("moov", raw(changed, mvhd), ...rebuilt, box("mvex", ...tracks.map(t => fullBox("trex", 0, words(t.id, 1, 0, 0, 0)))))])
}

function fragment(track: Track, origin: number, sequence: number) {
  const time = new Uint8Array(8); write64(view(time), 0, Math.max(0, track.samples[0].dts - Math.round(origin * track.timescale)))
  const table = new Uint8Array(track.samples.length * 16), v = view(table)
  track.samples.forEach((s, i) => { v.setUint32(i * 16, s.duration); v.setUint32(i * 16 + 4, s.size); v.setUint32(i * 16 + 8, s.sync ? 0x02000000 : 0x01010000); v.setInt32(i * 16 + 12, s.cts) })
  const make = (offset: number) => box("moof", fullBox("mfhd", 0, words(sequence)), box("traf", fullBox("tfhd", 0x020000, words(track.id)), fullBox("tfdt", 0x01000000, time), fullBox("trun", 0x01000f01, words(track.samples.length, offset), table), ...(track.groupType ? [fullBox("sbgp", 0, track.groupType, words(1, track.samples.length, 1))] : [])))
  const moof = make(0); return make(moof.length + 8)
}

export async function downloadProgressive(url: string, start: number, end: number, context: DownloadContext, onPackaging: () => void) {
  const onBytes = context.onBytes
  context.onBytes = undefined
  const { ftyp, moov } = await readMetadata(url, context), selected = selectProgressiveSamples(parseProgressiveTracks(moov), start, end)
  const bytes = selected.tracks.reduce((n, t) => n + t.samples.reduce((sum, s) => sum + s.size, 0), 0)
  if (bytes > context.maxBytes - context.receivedBytes) throw new Error("예상 다운로드 크기가 제한을 초과합니다. 화질이나 길이를 줄여주세요.")
  context.totalBytes = context.receivedBytes + bytes
  context.onBytes = onBytes
  const output: BlobPart[] = [fragmentedInit(ftyp, moov, selected.tracks, selected.endSeconds - selected.origin) as Uint8Array<ArrayBuffer>]
  let sequence = 1
  for (const track of selected.tracks) {
    const ranges: { start: number; end: number }[] = []
    for (const sample of track.samples) {
      const previous = ranges.at(-1)
      if (previous && previous.end + 1 === sample.offset && sample.offset + sample.size - previous.start <= 2 * 1024 * 1024) previous.end += sample.size
      else ranges.push({ start: sample.offset, end: sample.offset + sample.size - 1 })
    }
    const chunks = await concurrentMap(ranges, range => readAsset({ url, range }, context), 4, context.abort)
    output.push(fragment(track, selected.origin, sequence++) as Uint8Array<ArrayBuffer>)
    const size = track.samples.reduce((n, s) => n + s.size, 0), header = new Uint8Array(8); view(header).setUint32(0, size + 8); header.set([109, 100, 97, 116], 4)
    output.push(header, ...chunks as Uint8Array<ArrayBuffer>[])
  }
  context.signal.throwIfAborted(); onPackaging()
  return { blob: new Blob(output, { type: "video/mp4" }), startSeconds: selected.startSeconds, endSeconds: selected.endSeconds, extension: "mp4" as const }
}
