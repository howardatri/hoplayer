import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Plus,
  FolderOpen,
  Music,
  SortAsc,
  SortDesc
} from 'lucide-react'
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
  const globalQuery = useSearchStore((s) => s.query)
  const setGlobalQuery = useSearchStore((s) => s.setQuery)
  const [searchQuery, setSearchQuery] = useState(globalQuery)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Sync with global search query from sidebar
  useEffect(() => {
    if (globalQuery && globalQuery !== searchQuery) {
      setSearchQuery(globalQuery)
    }
  }, [globalQuery])

  // Clear global query when local search is cleared
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) {
      setGlobalQuery('')
    }
  }

  // Filter and sort tracks
  const filteredTracks = useMemo(() => {
    let result = [...tracks]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.album.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'artist':
          cmp = a.artist.localeCompare(b.artist)
          break
        case 'album':
          cmp = a.album.localeCompare(b.album)
          break
        case 'duration':
          cmp = a.duration - b.duration
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return result
  }, [tracks, searchQuery, sortField, sortDirection])

  const handlePlayTrack = useCallback(
    (track: Track) => {
      playTrack(track, filteredTracks)
    },
    [playTrack, filteredTracks]
  )

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/30">{filteredTracks.length} tracks</span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addDirectory}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white/60 hover:text-white transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Folder
            </motion.button>
          </div>
        </div>

        {/* Search and sort bar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, artist, or album..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-1">
            {(['title', 'artist', 'album', 'duration'] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  sortField === field
                    ? 'bg-primary/20 text-primary'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sortField === field &&
                  (sortDirection === 'asc' ? (
                    <SortAsc className="w-3 h-3" />
                  ) : (
                    <SortDesc className="w-3 h-3" />
                  ))}
              </button>
            ))}
          </div>
        </div>

        {/* Scan paths */}
        {scanPaths.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/20">
            <FolderOpen className="w-3 h-3" />
            {scanPaths.map((p, i) => (
              <span key={p}>
                {p}
                {i < scanPaths.length - 1 && ' · '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full"
            />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <Music className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No music yet</p>
            <p className="text-sm mb-6">Add a folder to start building your library</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addDirectory}
              className="flex items-center gap-2 px-6 py-2 bg-primary rounded-full text-white text-sm"
            >
              <FolderOpen className="w-4 h-4" />
              Add Folder
            </motion.button>
          </div>
        ) : (
          <TrackList
            tracks={filteredTracks}
            onPlayTrack={handlePlayTrack}
            height={600}
            showAlbum
          />
        )}
      </div>
    </div>
  )
}
