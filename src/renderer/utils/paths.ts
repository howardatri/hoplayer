/**
 * Path utilities for matching tracks to scan folders.
 */

// Normalize a path: forward slashes, lowercase, no trailing slash
function normalize(p: string): string {
  let n = p.replace(/\\/g, '/').toLowerCase()
  if (n.endsWith('/')) n = n.slice(0, -1)
  return n
}

/**
 * Find which scanPath a track belongs to (longest prefix match).
 * Returns the original scanPath string, or null if no match.
 */
export function getTrackFolder(filePath: string, scanPaths: string[]): string | null {
  const normFile = normalize(filePath)
  let best: string | null = null
  let bestLen = 0
  for (const p of scanPaths) {
    const normP = normalize(p)
    if (normFile.startsWith(normP + '/') || normFile === normP) {
      if (normP.length > bestLen) {
        best = p  // return the original path, not normalized
        bestLen = normP.length
      }
    }
  }
  return best
}

/**
 * Get a short display name for a folder path (last segment).
 */
export function getFolderDisplayName(fullPath: string): string {
  const parts = fullPath.replace(/\\/g, '/').split('/')
  return parts.filter(Boolean).pop() || fullPath
}

/**
 * Group tracks by their scan folder.
 * Returns a Map of originalScanPath -> Track[].
 * Tracks not matching any scanPath go into a "Unknown" group.
 */
export function groupTracksByFolder(tracks: { filePath: string }[], scanPaths: string[]): Map<string, typeof tracks> {
  const map = new Map<string, typeof tracks>()
  for (const track of tracks) {
    const folder = getTrackFolder(track.filePath, scanPaths) || '__unknown__'
    if (!map.has(folder)) map.set(folder, [])
    map.get(folder)!.push(track)
  }
  return map
}
