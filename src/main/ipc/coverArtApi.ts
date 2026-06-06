import { net } from 'electron'

function fetchJson(url: string): Promise<unknown | null> {
  return new Promise((resolve) => {
    const req = net.request({
      url,
      method: 'GET'
    })
    req.setHeader('User-Agent', 'hoplayer/0.1.0 (music-player)')
    req.on('response', (response) => {
      if (response.statusCode !== 200) {
        resolve(null)
        return
      }
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')))
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.end()
  })
}

function fetchBinary(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const req = net.request({ url, method: 'GET' })
    req.setHeader('User-Agent', 'hoplayer/0.1.0 (music-player)')
    req.on('response', (response) => {
      if (response.statusCode !== 200) {
        resolve(null)
        return
      }
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', () => resolve(null))
    req.end()
  })
}

export async function fetchOnlineCover(artist: string, album: string): Promise<string | null> {
  try {
    if (!artist || !album) return null

    const query = encodeURIComponent(`artist:"${artist}" AND release:"${album}"`)
    const searchUrl = `https://musicbrainz.org/ws/2/release-group/?query=${query}&fmt=json&limit=1`
    const data = await fetchJson(searchUrl) as { 'release-groups'?: Array<{ id: string }> } | null

    const rgId = data?.['release-groups']?.[0]?.id
    if (!rgId) return null

    const coverUrl = `https://coverartarchive.org/release-group/${rgId}/front-500`
    const imageBuffer = await fetchBinary(coverUrl)
    if (!imageBuffer) return null

    const base64 = imageBuffer.toString('base64')
    return `data:image/jpeg;base64,${base64}`
  } catch (e) {
    console.warn('[coverArtApi] fetch failed:', e)
    return null
  }
}
