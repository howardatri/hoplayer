import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Trash2, Music } from 'lucide-react'
import usePlaylistStore from '@/store/playlistStore'
import useLibraryStore from '@/store/libraryStore'
import { usePlayer } from '@/hooks/usePlayer'
import TrackList from '@/components/TrackList'
import type { Track } from '@shared/index'

interface PlaylistPageProps {
  playlistId: string
}

export default function PlaylistPage({ playlistId }: PlaylistPageProps) {
  const playlist = usePlaylistStore((s) => s.getPlaylistById(playlistId))
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist)
  const removeTrackFromPlaylist = usePlaylistStore((s) => s.removeTrackFromPlaylist)
  const tracks = useLibraryStore((s) => s.tracks)
  const { playTrack } = usePlayer()

  const playlistTracks = useMemo(() => {
    if (!playlist) return []
    return playlist.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter(Boolean) as Track[]
  }, [playlist, tracks])

  const handlePlayTrack = useCallback(
    (track: Track) => {
      playTrack(track, playlistTracks)
    },
    [playTrack, playlistTracks]
  )

  const handlePlayAll = () => {
    if (playlistTracks.length > 0) {
      playTrack(playlistTracks[0], playlistTracks)
    }
  }

  if (!playlist) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/30">
        <p>Playlist not found</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-end gap-6">
          {/* Playlist cover placeholder */}
          <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
            <Music className="w-16 h-16 text-primary/30" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Playlist</p>
            <h1 className="text-3xl font-bold text-white mb-2 truncate">{playlist.name}</h1>
            <p className="text-sm text-white/40 mb-4">
              {playlistTracks.length} tracks
            </p>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlayAll}
                disabled={playlistTracks.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-primary rounded-full text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                Play All
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (confirm('Delete this playlist?')) {
                    deletePlaylist(playlistId)
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 rounded-full text-sm text-white/50 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-hidden">
        {playlistTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <Music className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">This playlist is empty</p>
            <p className="text-xs text-white/20 mt-1">
              Add tracks from the library
            </p>
          </div>
        ) : (
          <TrackList
            tracks={playlistTracks}
            onPlayTrack={handlePlayTrack}
            height={500}
          />
        )}
      </div>
    </div>
  )
}
