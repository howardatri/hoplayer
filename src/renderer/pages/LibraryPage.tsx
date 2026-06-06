import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, Plus, FolderOpen, Music, SortAsc, SortDesc, LayoutGrid, LayoutList } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import { usePlayer } from '@/hooks/usePlayer'
import useSearchStore from '@/store/searchStore'
import TrackList from '@/components/TrackList'
import { groupTracksByFolder, getFolderDisplayName } from '@/utils/paths'
import type { Track } from '@shared/index'

type SortField = 'title' | 'artist' | 'album' | 'duration'
type SortDirection = 'asc' | 'desc'

interface LibraryPageProps {
  onNavigate?: (page: string) => void
}

function sortTracks(tracks: Track[], field: SortField, dir: SortDirection): Track[] {
  const sorted = [...tracks]
  sorted.sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'title': cmp = a.title.localeCompare(b.title); break
      case 'artist': cmp = a.artist.localeCompare(b.artist); break
      case 'album': cmp = a.album.localeCompare(b.album); break
      case 'duration': cmp = a.duration - b.duration; break
    }
    return dir === 'asc' ? cmp : -cmp
  })
  return sorted
}

export default function LibraryPage({ onNavigate }: LibraryPageProps) {
  const { tracks, addDirectory, isLoading, scanPaths } = useLibrary()
  const { playTrack } = usePlayer()
  const globalQuery = useSearchStore(s => s.query)
  const setGlobalQuery = useSearchStore(s => s.setQuery)
  const [searchQuery, setSearchQuery] = useState(globalQuery)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [grouped, setGrouped] = useState(true)

  useEffect(() => {
    if (globalQuery && globalQuery !== searchQuery) setSearchQuery(globalQuery)
  }, [globalQuery])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) setGlobalQuery('')
  }

  // Filter
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks
    const q = searchQuery.toLowerCase()
    return tracks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    )
  }, [tracks, searchQuery])

  // Group or flat
  const showGrouped = grouped && scanPaths.length > 1 && !searchQuery.trim()

  const groups = useMemo(() => {
    if (!showGrouped) return null
    const map = groupTracksByFolder(filteredTracks, scanPaths)
    // Sort within each group
    const result: { folder: string; displayName: string; tracks: Track[] }[] = []
    for (const [folder, folderTracks] of map) {
      if (folder === '__unknown__') continue
      result.push({
        folder,
        displayName: getFolderDisplayName(folder),
        tracks: sortTracks(folderTracks, sortField, sortDirection)
      })
    }
    // Sort groups by name
    result.sort((a, b) => a.displayName.localeCompare(b.displayName))
    return result
  }, [filteredTracks, scanPaths, showGrouped, sortField, sortDirection])

  const sortedFlat = useMemo(() => sortTracks(filteredTracks, sortField, sortDirection), [filteredTracks, sortField, sortDirection])

  const handlePlayTrack = useCallback((track: Track) => playTrack(track, filteredTracks), [playTrack, filteredTracks])

  const handlePlayGroup = (groupTracks: Track[]) => {
    if (groupTracks.length > 0) playTrack(groupTracks[0], groupTracks)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const sortBtnStyle = (field: SortField): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: sortField === field ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
    color: sortField === field ? 'var(--color-primary-light, #9b82f8)' : 'var(--color-text-muted)'
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Library</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{filteredTracks.length} tracks</span>
            <button
              onClick={() => addDirectory()}
              disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)', borderRadius: 9999, fontSize: 14, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
            >
              <Plus size={16} />
              Add Folder
            </button>
          </div>
        </div>

        {/* Search + Sort + Group toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by title, artist, or album..."
              style={{ width: '100%', padding: '8px 16px 8px 40px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 14, color: 'var(--color-text)', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['title', 'artist', 'album', 'duration'] as SortField[]).map(field => (
              <button key={field} onClick={() => toggleSort(field)} style={sortBtnStyle(field)}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sortField === field && (sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
              </button>
            ))}
          </div>
          {/* Group toggle — only show when multiple folders */}
          {scanPaths.length > 1 && (
            <button
              onClick={() => setGrouped(g => !g)}
              title={grouped ? 'Flat view' : 'Group by folder'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer',
                background: grouped ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                color: grouped ? 'var(--color-primary-light, #9b82f8)' : 'var(--color-text-muted)'
              }}
            >
              {grouped ? <LayoutGrid size={14} /> : <LayoutList size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Track list */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ width: 32, height: 32, border: '2px solid color-mix(in srgb, var(--color-primary) 20%, transparent)', borderTopColor: 'var(--color-primary, #7c5bf5)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : tracks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
            <Music size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>No music yet</p>
            <p style={{ fontSize: 14, marginBottom: 24 }}>Add a folder to start building your library</p>
            <button
              onClick={() => addDirectory()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))', color: 'var(--color-text)', border: 'none', borderRadius: 9999, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
            >
              <FolderOpen size={16} />
              Add Folder
            </button>
          </div>
        ) : showGrouped && groups ? (
          // Grouped view
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
            {groups.map(group => (
              <div key={group.folder}>
                {/* Folder header */}
                <div style={{
                  position: 'sticky', top: 0, zIndex: 10,
                  padding: '10px 32px',
                  background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)',
                  backdropFilter: 'blur(8px)',
                  borderBottom: '1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <FolderOpen size={16} style={{ color: 'var(--color-primary, #7c5bf5)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{group.displayName}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{group.tracks.length} tracks</span>
                  <button
                    onClick={() => handlePlayGroup(group.tracks)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary-light, #9b82f8)', cursor: 'pointer' }}
                  >
                    Play
                  </button>
                </div>
                {/* Tracks in this group */}
                <div style={{ padding: '0 16px' }}>
                  <TrackList tracks={group.tracks} onPlayTrack={(t) => playTrack(t, group.tracks)} height={Math.min(group.tracks.length * 56, 400)} showAlbum showFolder={false} onNavigate={onNavigate} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat view
          <TrackList tracks={sortedFlat} onPlayTrack={handlePlayTrack} height={600} showAlbum showFolder onNavigate={onNavigate} />
        )}
      </div>
    </div>
  )
}
