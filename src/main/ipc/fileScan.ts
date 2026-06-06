import { readdir, stat, readFile } from 'fs/promises'
import { join, extname } from 'path'
import { parseFile } from 'music-metadata'
import NodeID3 from 'node-id3'
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
      format: isVideo ? 'video' : 'audio',
      genre: common.genre?.[0] || undefined,
      year: common.year || undefined,
      trackNumber: common.track?.no || undefined,
      bitrate: format.bitrate ? Math.round(format.bitrate) : undefined
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
    const { access, readFile } = await import('fs/promises')
    const { dirname, join, extname, basename } = await import('path')

    const dir = dirname(filePath)

    // First, check for local cover files (cover.jpg, cover.png, folder.jpg, etc.)
    const coverNames = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png', 'front.jpg', 'front.png']
    // Also check {filename}.jpg and {filename}.cover.jpg (saved by online fetch)
    const nameWithoutExt = basename(filePath, extname(filePath))
    coverNames.push(
      `${nameWithoutExt}.cover.jpg`, `${nameWithoutExt}.cover.png`,
      `${nameWithoutExt}.jpg`, `${nameWithoutExt}.png`
    )

    for (const name of coverNames) {
      try {
        const coverPath = join(dir, name)
        await access(coverPath)
        const buffer = await readFile(coverPath)
        const mime = name.endsWith('.png') ? 'image/png' : 'image/jpeg'
        const base64 = buffer.toString('base64')
        return `data:${mime};base64,${base64}`
      } catch {
        // File doesn't exist, try next
      }
    }

    // Fallback: extract from audio metadata
    const metadata = await parseFile(filePath)
    const picture = metadata.common.picture?.[0]
    if (!picture) return null

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

export async function readLrcFile(filePath: string): Promise<string | null> {
  try {
    await stat(filePath)
    const content = await readFile(filePath, 'utf-8')
    return content
  } catch {
    return null
  }
}

export async function saveCoverFile(audioFilePath: string, dataUrl: string): Promise<boolean> {
  try {
    const { writeFile } = await import('fs/promises')
    const { dirname, join } = await import('path')

    // Parse data URL
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!match) return false

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
    const buffer = Buffer.from(match[2], 'base64')

    // Save as {filename}.cover.jpg in the same directory as the audio file
    const { basename, extname } = await import('path')
    const dir = dirname(audioFilePath)
    const nameWithoutExt = basename(audioFilePath, extname(audioFilePath))
    const coverPath = join(dir, `${nameWithoutExt}.cover.${ext}`)

    await writeFile(coverPath, buffer)
    return true
  } catch (e) {
    console.error('[saveCoverFile] Failed:', e)
    return false
  }
}

export async function writeTrackTag(
  filePath: string,
  tags: { title?: string; artist?: string; album?: string; genre?: string; year?: number; trackNumber?: number }
): Promise<boolean> {
  const ext = extname(filePath).toLowerCase()

  if (ext === '.mp3') {
    try {
      const id3Tags: NodeID3.Tags = {}
      if (tags.title !== undefined) id3Tags.title = tags.title
      if (tags.artist !== undefined) id3Tags.artist = tags.artist
      if (tags.album !== undefined) id3Tags.album = tags.album
      if (tags.genre !== undefined) id3Tags.genre = tags.genre
      if (tags.year !== undefined) id3Tags.year = String(tags.year)
      if (tags.trackNumber !== undefined) id3Tags.trackNumber = String(tags.trackNumber)

      const result = NodeID3.update(id3Tags, filePath)
      if (result instanceof Error) {
        console.error('[writeTrackTag] node-id3 error:', result.message)
        return false
      }
      return true
    } catch (e) {
      console.error('[writeTrackTag] Failed for MP3:', e)
      return false
    }
  }

  // For other formats, tag writing is not yet supported
  console.warn('[writeTrackTag] Writing tags is only supported for MP3 files. Got:', ext)
  return false
}
