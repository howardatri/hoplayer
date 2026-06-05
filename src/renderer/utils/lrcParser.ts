export interface LyricLine {
  time: number // seconds
  text: string
}

/**
 * Parse an LRC (lyrics) file into an array of timed lyric lines.
 * Supports standard LRC format: [mm:ss.xx] text
 * Also supports extended tags: [ti:], [ar:], [al:], [by:]
 */
export function parseLrc(lrcContent: string): {
  metadata: { title?: string; artist?: string; album?: string; by?: string }
  lines: LyricLine[]
} {
  const lines: LyricLine[] = []
  const metadata: { title?: string; artist?: string; album?: string; by?: string } = {}

  const rawLines = lrcContent.split('\n')

  for (const rawLine of rawLines) {
    const line = rawLine.trim()
    if (!line) continue

    // Check for metadata tags
    const metaMatch = line.match(/^\[(ti|ar|al|by):(.*)\]$/)
    if (metaMatch) {
      const [, key, value] = metaMatch
      switch (key) {
        case 'ti':
          metadata.title = value.trim()
          break
        case 'ar':
          metadata.artist = value.trim()
          break
        case 'al':
          metadata.album = value.trim()
          break
        case 'by':
          metadata.by = value.trim()
          break
      }
      continue
    }

    // Parse timed lyrics: [mm:ss.xx] or [mm:ss.xxx] or [mm:ss]
    // Can have multiple timestamps per line: [01:00.00][02:00.00] text
    const timeRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g
    const timestamps: number[] = []
    let match: RegExpExecArray | null

    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0
      timestamps.push(minutes * 60 + seconds + ms / 1000)
    }

    if (timestamps.length === 0) continue

    // Extract the text after all timestamps
    const text = line.replace(/\[\d{1,3}:\d{2}(?:\.\d{1,3})?\]/g, '').trim()
    if (!text) continue

    for (const time of timestamps) {
      lines.push({ time, text })
    }
  }

  // Sort by time
  lines.sort((a, b) => a.time - b.time)

  return { metadata, lines }
}

/**
 * Find the index of the current lyric line based on playback time.
 * Returns -1 if no matching line found.
 */
export function findCurrentLyricIndex(
  lines: LyricLine[],
  currentTime: number
): number {
  if (lines.length === 0) return -1

  // Binary search for the current line
  let low = 0
  let high = lines.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (lines[mid].time <= currentTime) {
      if (mid === lines.length - 1 || lines[mid + 1].time > currentTime) {
        return mid
      }
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return -1
}

/**
 * Try to find a .lrc file matching a given audio file path.
 * Checks common patterns:
 *   - same_name.lrc
 *   - same_name.lrc in lyrics/ subfolder
 * Returns the expected .lrc path, or null if not determinable.
 */
export function getLrcPath(audioFilePath: string): string | null {
  const lastDot = audioFilePath.lastIndexOf('.')
  if (lastDot === -1) return null
  return audioFilePath.substring(0, lastDot) + '.lrc'
}
