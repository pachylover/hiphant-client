const http = require('node:http')
const streamers = [{ channelId: 'alpha', channelName: '별빛스트리머' }, { channelId: 'beta', channelName: '달빛스트리머' }]
const items = Array.from({ length: 15 }, (_, index) => ({ id: index + 1, videoId: String(1000 + index), videoTitle: `분석된 방송 ${index + 1}`, ...streamers[index % 2], publishDate: '2026-10-20 12:00:00', thumbnailImageUrl: null, minute: 1000, createdAt: '2026-10-21T00:00:00Z' }))
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')
  const url = new URL(req.url, 'http://localhost')
  const query = url.searchParams.get('query') || ''
  if (query === '오류') { res.writeHead(503); res.end('{}'); return }
  let body = { resultCode: 200, list: [], count: 0 }
  if (url.pathname === '/api/v1/highlights/recent') {
    body = { resultCode: 200, count: 6, list: items.slice(0, 6) }
  } else if (url.pathname === '/api/v1/highlights') {
    const channel = url.searchParams.get('channelId')
    const filtered = items.filter(item => (!channel || item.channelId === channel) && item.channelName.includes(query))
    const page = Number(url.searchParams.get('page') || 0)
    const size = Number(url.searchParams.get('size') || 12)
    body = { resultCode: 200, page, size, total: filtered.length, totalPages: Math.ceil(filtered.length / size), list: filtered.slice(page * size, (page + 1) * size) }
  } else if (url.pathname === '/api/v1/highlights/streamers') {
    const list = streamers.filter(item => item.channelName.includes(query))
    body = { resultCode: 200, list, count: list.length }
  }
  const delayed = (url.pathname === '/api/v1/highlights' &&
    (url.searchParams.get('page') === '1' || query === '지연'))
  if (query === '타임아웃') setTimeout(() => res.end(JSON.stringify(body)), 20000)
  else if (delayed) setTimeout(() => res.end(JSON.stringify(body)), 1500)
  else res.end(JSON.stringify(body))
}).listen(18082, '127.0.0.1', () => console.log('Browse fixture API ready'))
