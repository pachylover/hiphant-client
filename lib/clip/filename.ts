export function buildClipFilename(channel: string, title: string, startSeconds: number, endSeconds: number, extension: "mp4" | "ts" = "mp4") {
  const safe = (value: string) => value.replace(/[\/\\:*?"<>|\u0000-\u001f\u007f]/g, "").replace(/[. ]+$/g, "").trim().slice(0, 60) || "clip"
  const start = Math.max(0, Math.floor(startSeconds)), time = [Math.floor(start / 3600), Math.floor(start / 60) % 60, start % 60].map(n => String(n).padStart(2, "0")).join("-")
  return `${safe(channel)}-${safe(title)}-${time}-${Math.ceil(endSeconds - startSeconds)}s.${extension}`
}
