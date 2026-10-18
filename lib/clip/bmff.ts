// Independent ISO BMFF reader/writer. No media bytes or source URLs are logged.
export interface Box { type: string; start: number; end: number; data: number }
export const view = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset, data.byteLength)
export function uint64(v: DataView, offset: number): number {
  const n = v.getUint32(offset) * 4294967296 + v.getUint32(offset + 4)
  if (!Number.isSafeInteger(n)) throw new Error("영상의 64비트 값이 지원 범위를 초과합니다.")
  return n
}
export function write64(v: DataView, offset: number, n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("잘못된 영상 시간 값입니다.")
  v.setUint32(offset, Math.floor(n / 4294967296)); v.setUint32(offset + 4, n % 4294967296)
}
export function boxes(data: Uint8Array, start = 0, end = data.length): Box[] {
  const result: Box[] = [], v = view(data)
  for (let p = start; p < end;) {
    if (p + 8 > end) throw new Error("영상 메타데이터가 잘렸습니다.")
    let size = v.getUint32(p), header = 8
    if (size === 1) { if (p + 16 > end) throw new Error("잘못된 MP4 헤더입니다."); size = uint64(v, p + 8); header = 16 }
    if (size === 0) size = end - p
    if (size < header || p + size > end) throw new Error("잘못된 MP4 박스 크기입니다.")
    result.push({ type: String.fromCharCode(...data.subarray(p + 4, p + 8)), start: p, end: p + size, data: p + header }); p += size
  }
  return result
}
export function child(data: Uint8Array, parent: Box, type: string): Box {
  const found = boxes(data, parent.data, parent.end).find(b => b.type === type)
  if (!found) throw new Error(`지원하지 않는 MP4 구조입니다 (${type}).`)
  return found
}
export function concat(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0
  for (const p of parts) { output.set(p, at); at += p.length } return output
}
export function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const body = concat(parts), result = new Uint8Array(body.length + 8)
  view(result).setUint32(0, result.length); result.set(Array.from(type).map(c => c.charCodeAt(0)), 4); result.set(body, 8); return result
}
export function words(...values: number[]): Uint8Array { const b = new Uint8Array(values.length * 4); values.forEach((n, i) => view(b).setUint32(i * 4, n)); return b }
export function fullBox(type: string, flags: number, ...parts: Uint8Array[]) { return box(type, words(flags), ...parts) }
export function raw(data: Uint8Array, b: Box) { return data.slice(b.start, b.end) }
export function duration(data: Uint8Array, b: Box, value: number) {
  const v = view(data), version = data[b.data]
  const offset = b.data + (b.type === "tkhd" ? version === 1 ? 28 : 20 : version === 1 ? 24 : 16)
  if (version === 1) write64(v, offset, value); else v.setUint32(offset, Math.min(0xffffffff, value))
}
export function trackInfo(data: Uint8Array, trak: Box) {
  const tkhd = child(data, trak, "tkhd"), mdia = child(data, trak, "mdia"), mdhd = child(data, mdia, "mdhd"), v = view(data)
  return { id: v.getUint32(tkhd.data + (data[tkhd.data] === 1 ? 20 : 12)), timescale: v.getUint32(mdhd.data + (data[mdhd.data] === 1 ? 20 : 12)), tkhd, mdia, mdhd }
}
