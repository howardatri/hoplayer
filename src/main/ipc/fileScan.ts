import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'
import { parseFile } from 'music-metadata'
import { v4 as uuidv4 } from 'uuid'
import type { Track, ScanResult } from '../../shared'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mkv', '.avi'])
const SUPPORTED_EXTENSIONS = new Set([...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS])

export async function scanDirectory(dirPath: string): Promise<ScanResult> {
  const tracks: Track[] = []
  const errors: { filePath: string; error: string }[] = []

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (err) {
      errors.push({ filePath: dir, error: `Cannot read directory: ${err}` })
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        // Skip hidden directories
        if (!entry.name.startsWith('.')) {
          await walk(fullPath)
        }
        continue
      }

      if (!entry.isFile()) continue

      const ext = extname(entry.name).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue

      try {
        const track = await extractTrackMetadata(fullPath, ext)
        if (track) {
          tracks.push(track)
        }
      } catch (err) {
        errors.push({ filePath: fullPath, error: String(err) })
      }
    }
  }

  await walk(dirPath)

  return { tracks, errors }
}

async function extractTrackMetadata(filePath: string, ext: string): Promise<Track | null> {
  const isVideo = VIDEO_EXTENSIONS.has(ext)

  try {
    const metadata = await parseFile(filePath)
    const { common, format } = metadata

    return {
      id: uuidv4(),
      title: common.title || filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Unknown',
      artist: common.artist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      duration: format.duration || 0,
      filePath,
      format: isVideo ? 'video' : 'audio'
    }
  } catch {
    // If metadata parsing fails, create basic track info
    const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Unknown'
    return {
      id: uuidv4(),
      title: fileName,
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: 0,
      filePath,
      format: isVideo ? 'video' : 'audio'
    }
  }
}

export async function getFileCover(filePath: string): Promise<string | null> {
  try {
    const metadata = await parseFile(filePath)
    const picture = metadata.common.picture?.[0]
    if (!picture) return null

    // Convert to base64 data URL
    const base64 = Buffer.from(picture.data).toString('base64')
    const mime = picture.format || 'image/jpeg'
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
}

export async function readFileMetadata(filePath: string): Promise<Partial<Track> | null> {
  try {
    const metadata = await parseFile(filePath)
    const { common, format } = metadata
    return {
      title: common.title,
      artist: common.artist,
      album: common.album,
      duration: format.duration
    }
  } catch {
    return null
  }
}
