import { boxes, child, duration, raw, trackInfo, uint64, view, write64 } from "./bmff"

// W3C ISO BMFF byte stream format: require movie-fragment relative addressing.
// Remove stale file indexes, preserve moof/mdat positions relative to each other,
// and subtract a common presentation origin to preserve inter-track sync.
export function packageFmp4(initData: Uint8Array, segments: Uint8Array[], durationSeconds: number): Blob {
  const init = initData.slice(), top = boxes(init), moov = top.find(b => b.type === "moov"), ftyp = top.find(b => b.type === "ftyp")
  if (!moov || !ftyp || !boxes(init, moov.data, moov.end).some(b => b.type === "mvex")) throw new Error("지원하지 않는 fMP4 초기화 정보입니다.")
  const tracks = boxes(init, moov.data, moov.end).filter(b => b.type === "trak").map(t => ({ ...trackInfo(init, t), trak: t }))
  if (!tracks.length || tracks.some(t => !t.timescale)) throw new Error("영상 트랙 정보가 올바르지 않습니다.")
  const defaults = new Map<number, number>()
  for (const trex of boxes(init, child(init, moov, "mvex").data, child(init, moov, "mvex").end).filter(b => b.type === "trex")) defaults.set(view(init).getUint32(trex.data + 4), view(init).getUint32(trex.data + 20))
  for (const t of tracks) {
    const stsd = child(init, child(init, child(init, t.mdia, "minf"), "stbl"), "stsd")
    const entries = boxes(init, stsd.data + 8, stsd.end)
    if (!entries.length || entries.some(b => !["avc1", "avc3", "hvc1", "hev1", "mp4a"].includes(b.type))) throw new Error("지원하지 않는 코덱 또는 암호화 영상입니다.")
    if (boxes(init, t.trak.data, t.trak.end).some(b => b.type === "edts")) throw new Error("편집 목록이 포함된 fMP4는 지원하지 않습니다.")
  }
  const mvhd = child(init, moov, "mvhd"), movieScale = view(init).getUint32(mvhd.data + (init[mvhd.data] === 1 ? 20 : 12))
  duration(init, mvhd, Math.round(durationSeconds * movieScale))
  for (const t of tracks) { duration(init, t.tkhd, Math.round(durationSeconds * movieScale)); duration(init, t.mdhd, Math.round(durationSeconds * t.timescale)) }
  const parts: BlobPart[] = [raw(init, ftyp) as Uint8Array<ArrayBuffer>, raw(init, moov) as Uint8Array<ArrayBuffer>]
  let origin: number | undefined, sequence = 1
  const seenTracks = new Set<number>()
  for (const segment of segments) {
    const v = view(segment), topBoxes = boxes(segment)
    if (!topBoxes.some(b => b.type === "moof") || !topBoxes.some(b => b.type === "mdat")) throw new Error("fMP4 미디어 구간이 올바르지 않습니다.")
    for (const moof of topBoxes.filter(b => b.type === "moof")) {
      const trafs = boxes(segment, moof.data, moof.end).filter(b => b.type === "traf")
      if (!trafs.length) throw new Error("fMP4 트랙 조각이 없습니다.")
      const times = trafs.map(traf => {
        const tfhd = child(segment, traf, "tfhd"), tfdt = child(segment, traf, "tfdt"), flags = v.getUint32(tfhd.data) & 0xffffff
        if (flags & 1 || !(flags & 0x020000) && trafs.length !== 1) throw new Error("절대 위치를 참조하는 fMP4는 지원하지 않습니다.")
        if (boxes(segment, traf.data, traf.end).some(b => ["senc", "saiz", "saio"].includes(b.type))) throw new Error("암호화 영상은 지원하지 않습니다.")
        const runs = boxes(segment, traf.data, traf.end).filter(b => b.type === "trun")
        if (!runs.length || !(v.getUint32(runs[0].data) & 1)) throw new Error("상대 데이터 위치가 없는 fMP4는 지원하지 않습니다.")
        const id = v.getUint32(tfhd.data + 4), track = tracks.find(t => t.id === id)
        if (!track) throw new Error("알 수 없는 영상 트랙입니다.")
        const time = segment[tfdt.data] === 1 ? uint64(v, tfdt.data + 4) : v.getUint32(tfdt.data + 4)
        if (!seenTracks.has(id)) {
          // The first decoded sample must be random-access; do not silently
          // produce a clip with missing reference frames.
          const run = runs[0], runFlags = v.getUint32(run.data) & 0xffffff
          if (!v.getUint32(run.data + 4)) throw new Error("빈 fMP4 샘플 표입니다.")
          let defaultOffset = tfhd.data + 8
          if (flags & 2) defaultOffset += 4
          if (flags & 8) defaultOffset += 4
          if (flags & 16) defaultOffset += 4
          let firstFlags = flags & 32 ? v.getUint32(defaultOffset) : defaults.get(id) ?? 0
          let sampleOffset = run.data + 8 + (runFlags & 1 ? 4 : 0)
          if (runFlags & 4) { firstFlags = v.getUint32(sampleOffset); sampleOffset += 4 }
          if (runFlags & 0x100) sampleOffset += 4
          if (runFlags & 0x200) sampleOffset += 4
          if (runFlags & 0x400) firstFlags = v.getUint32(sampleOffset)
          if (firstFlags & 0x10000 || (firstFlags >>> 24 & 3) === 1) throw new Error("키프레임으로 시작하지 않는 영상 구간은 지원하지 않습니다.")
        }
        seenTracks.add(id)
        return { tfdt, track, time }
      })
      if (origin === undefined) origin = Math.min(...times.map(t => t.time / t.track.timescale))
      for (const { tfdt, track, time } of times) {
        const adjusted = time - Math.round(origin * track.timescale)
        if (adjusted < 0) throw new Error("트랙 시간이 역전되는 fMP4는 지원하지 않습니다.")
        if (segment[tfdt.data] === 1) write64(v, tfdt.data + 4, adjusted); else v.setUint32(tfdt.data + 4, adjusted)
      }
      v.setUint32(child(segment, moof, "mfhd").data + 4, sequence++)
    }
    // Keep all bytes between moof and mdat intact; styp/sidx before the first
    // moof describe the original asset and are deliberately omitted.
    const first = topBoxes.find(b => b.type === "moof")!.start
    const last = topBoxes.filter(b => b.type === "mdat").at(-1)!.end
    if (topBoxes.some(b => b.start >= first && b.end <= last && ["sidx", "ssix", "mfra"].includes(b.type))) throw new Error("내부 인덱스가 포함된 fMP4는 지원하지 않습니다.")
    parts.push(segment.subarray(first, last) as Uint8Array<ArrayBuffer>)
  }
  if (seenTracks.size !== tracks.length) throw new Error("일부 영상 트랙이 누락되었습니다.")
  return new Blob(parts, { type: "video/mp4" })
}
