import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, Plus, FolderOpen, Music, SortAsc, SortDesc } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import { usePlayer } from '@/hooks/usePlayer'
import useSearchStore from '@/store/searchStore'
import TrackList from '@/components/TrackList'
import type { Track } from '@shared/index'

type SortField = 'title' | 'artist' | 'album' | 'duration'
type SortDirection = 'asc' | 'desc'

export default function LibraryPage() {
  const { tracks, addDirectory, isLoading, scanPaths } = useLibrary()
  const { playTrack } = usePlayer()
  const globalQuery = useSearchStore(s => s.query)
  const setGlobalQuery = useSearchStore(s => s.setQuery)
  const [searchQuery, setSearchQuery] = useState(globalQuery)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    if (globalQuery && globalQuery !== searchQuery) setSearchQuery(globalQuery)
  }, [globalQuery])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) setGlobalQuery('')
  }

  const filteredTracks = useMemo(() => {
    let result = [...tracks]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break
        case 'artist': cmp = a.artist.localeCompare(b.artist); break
        case 'album': cmp = a.album.localeCompare(b.album); break
        case 'duration': cmp = a.duration - b.duration; break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return result
  }, [tracks, searchQuery, sortField, sortDirection])

  const handlePlayTrack = useCallback((track: Track) => playTrack(track, filteredTracks), [playTrack, filteredTracks])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const sortBtnStyle = (field: SortField): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: sortField === field ? 'rgba(99,102,241,0.2)' : 'transparent',
    color: sortField === field ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.3)'
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>Library</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>{filteredTracks.length} tracks</span>
            <button
              onClick={() => { console.log('[LibraryPage] Add Folder clicked'); addDirectory() }}
              disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9999, fontSize: 14, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
            >
              <Plus size={16} />
              Add Folder
            </button>
          </div>
        </div>

        {/* Search + Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by title, artist, or album..."
              style={{ width: '100%', padding: '8px 16px 8px 40px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, color: 'white', outline: 'none' }}
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
        </div>

        {scanPaths.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
            <FolderOpen size={12} />
            {scanPaths.join(' · ')}
          </div>
        )}
      </div>

      {/* Track list */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--color-primary, #6366f1)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : tracks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>
            <Music size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>No music yet</p>
            <p style={{ fontSize: 14, marginBottom: 24 }}>Add a folder to start building your library</p>
            <button
              onClick={() => addDirectory()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'var(--color-primary, #6366f1)', color: 'white', border: 'none', borderRadius: 9999, fontSize: 14, cursor: 'pointer' }}
            >
              <FolderOpen size={16} />
              Add Folder
            </button>
          </div>
        ) : (
          <TrackList tracks={filteredTracks} onPlayTrack={handlePlayTrack} height={600} showAlbum />
        )}
      </div>
    </div>
  )
}
