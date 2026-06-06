import { net } from 'electron'
import { extname, join, dirname, basename } from 'path'
import { writeFileSync } from 'fs'

export interface LyricResult {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    request.setHeader('User-Agent', 'hoplayer v0.1.0')
    request.on('response', (response) => {
      if (response.statusCode === 404) {
        resolve(null)
        return
      }
      if (response.statusCode !== 200) {
        console.warn(`[lyrics] HTTP ${response.statusCode} for ${url}`)
        resolve(null)
        return
      }
      const contentType = response.headers['content-type']?.toString() || ''
      let data = ''
      response.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      response.on('end', () => {
        if (!contentType.includes('json')) {
          console.warn(`[lyrics] non-JSON response (${contentType}): ${data.slice(0, 100)}`)
          resolve(null)
          return
        }
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          console.warn('[lyrics] JSON parse failed:', (e as Error).message)
          resolve(null)
        }
      })
    })
    request.on('error', (e) => {
      console.warn('[lyrics] request failed:', e.message)
      resolve(null)
    })
    request.end()
  })
}

export async function searchLyrics(query: string): Promise<LyricResult[]> {
  const url = 'https://lrclib.net/api/search?q=' + encodeURIComponent(query)
  const result = await fetchJson(url)
  return Array.isArray(result) ? result : []
}

export async function searchLyricsExact(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number
): Promise<LyricResult | null> {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName
  })
  if (albumName) params.set('album_name', albumName)
  if (duration) params.set('duration', Math.round(duration).toString())

  const url = 'https://lrclib.net/api/get?' + params.toString()
  return fetchJson(url)
}

export async function saveLyricsFile(
  audioFilePath: string,
  lrcContent: string
): Promise<string> {
  const dir = dirname(audioFilePath)
  const name = basename(audioFilePath, extname(audioFilePath))
  const lrcPath = join(dir, name + '.lrc')
  writeFileSync(lrcPath, lrcContent, 'utf-8')
  return lrcPath
}
