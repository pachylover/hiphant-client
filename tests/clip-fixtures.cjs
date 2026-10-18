// Structural ISO BMFF fixtures, deliberately not encoded audiovisual content.
const words = (...ns) => { const b = Buffer.alloc(ns.length * 4); ns.forEach((n, i) => b.writeUInt32BE(n >>> 0, i * 4)); return b }
const box = (name, ...parts) => { const b = Buffer.concat([Buffer.alloc(8), ...parts]); b.writeUInt32BE(b.length); b.write(name, 4, 4); return b }
const full = (name, flags, ...parts) => box(name, words(flags), ...parts)
const ftyp = box('ftyp', Buffer.from('isom'), words(512), Buffer.from('isomiso6mp41'))
const mvhd = () => full('mvhd', 0, words(0, 0, 1000, 10000), Buffer.alloc(80))
const tkhd = () => full('tkhd', 3, words(0, 0, 1, 0, 10000), Buffer.alloc(60))
const mdhd = () => full('mdhd', 0, words(0, 0, 1000, 10000, 0))
const hdlr = () => full('hdlr', 0, words(0), Buffer.from('vide'), Buffer.alloc(12))
const stsd = () => full('stsd', 0, words(1), box('avc1', Buffer.alloc(78)))
const track = (stbl) => box('trak', tkhd(), box('mdia', mdhd(), hdlr(), box('minf', stbl)))
function fmp4Init() {
  return Buffer.concat([ftyp, box('moov', mvhd(), track(box('stbl', stsd(), full('stts', 0, words(0)), full('stsc', 0, words(0)), full('stsz', 0, words(0, 0)), full('stco', 0, words(0)))), box('mvex', full('trex', 0, words(1, 1, 1000, 4, 0x02000000))))])
}
function fmp4Segment(decodeTime = 0) {
  const time = words(0, decodeTime)
  const make = (offset) => box('moof', full('mfhd', 0, words(7)), box('traf', full('tfhd', 0x020000, words(1)), full('tfdt', 0x01000000, time), full('trun', 0x301, words(1, offset, 1000, 4))))
  const first = make(0)
  return Buffer.concat([box('styp', Buffer.from('msdh'), words(0), Buffer.from('msdh')), make(first.length + 8), box('mdat', Buffer.from([1,2,3,4]))])
}
function progressive({ editTime, audioRoll } = {}) {
  const stbl = (offset, audio) => box('stbl', audio ? full('stsd', 0, words(1), box('mp4a', Buffer.alloc(28))) : stsd(), full('stts', 0, words(1, 10, 1000)), full('stsc', 0, words(1, 1, 10, 1)), full('stsz', 0, words(4, 10)), full('stco', 0, words(1, offset)), ...(audio ? [full('sgpd', 0x01000000, Buffer.from('roll'), words(2, 1), Buffer.from([255, 255])), full('sbgp', 0, Buffer.from('roll'), words(1, 10, 1))] : [full('stss', 0, words(5, 1, 3, 5, 7, 9))]))
  const editedTrack = (offset, audio = false) => {
    const header = tkhd(); if (audio) header.writeUInt32BE(2, 20)
    const handler = audio ? full('hdlr', 0, words(0), Buffer.from('soun'), Buffer.alloc(12)) : hdlr()
    const edit = editTime === undefined ? [] : [box('edts', full('elst', 0, words(1, 10000, editTime, 0x00010000)))]
    return box('trak', header, ...edit, box('mdia', mdhd(), handler, box('minf', stbl(offset, audio))))
  }
  const make = offset => box('moov', mvhd(), editedTrack(offset), ...(audioRoll ? [editedTrack(offset + 40, true)] : []))
  const moov = make(0), offset = ftyp.length + moov.length + 8
  return { file: Buffer.concat([ftyp, make(offset), box('mdat', Buffer.from(Array.from({ length: audioRoll ? 80 : 40 }, (_, i) => i)))]), moov: make(offset), mediaOffset: offset }
}
module.exports = { box, full, words, fmp4Init, fmp4Segment, progressive }
