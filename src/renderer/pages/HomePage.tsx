import { motion } from 'framer-motion'
import { FolderOpen, Music, Play, TrendingUp, Clock } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import { usePlayer } from '@/hooks/usePlayer'
import usePlayerStore from '@/store/playerStore'
import CoverArt from '@/components/CoverArt'
import type { Track } from '@shared/index'

export default function HomePage() {
  const { tracks, addDirectory, isLoading } = useLibrary()
  const { playTrack } = usePlayer()

  // Get recently added tracks (last 8)
  const recentTracks = [...tracks].reverse().slice(0, 8)

  // Get unique artists for quick access
  const artists = [...new Set(tracks.map((t) => t.artist))].slice(0, 6)

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {tracks.length === 0 ? (
        <EmptyState onAddFolder={addDirectory} isLoading={isLoading} />
      ) : (
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Hero section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-6"
          >
            <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
              <Music className="w-20 h-20 text-primary/40" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Music Library</h1>
              <p className="text-white/40 mb-4">
                {tracks.length} tracks · {artists.length} artists
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary rounded-full text-white text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                Play All
              </motion.button>
            </div>
          </motion.div>

          {/* Recently Added */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-white/40" />
                Recently Added
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {recentTracks.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => playTrack(track, tracks)}
                  className="group cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="relative mb-3">
                    <CoverArt
                      filePath={track.filePath}
                      size="lg"
                      className="w-full aspect-square rounded-lg"
                    />
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
                    </motion.button>
                  </div>
                  <div className="text-sm text-white/90 truncate font-medium">
                    {track.title}
                  </div>
                  <div className="text-xs text-white/40 truncate">{track.artist}</div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Quick Artists */}
          <section>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-white/40" />
              Artists
            </h2>
            <div className="grid grid-cols-6 gap-3">
              {artists.map((artist, i) => {
                const artistTracks = tracks.filter((t) => t.artist === artist)
                return (
                  <motion.div
                    key={artist}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => playTrack(artistTracks[0], artistTracks)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                      <span className="text-xl font-bold text-white/40">
                        {artist.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-white/60 text-center truncate w-full">
                      {artist}
                    </div>
                    <div className="text-xs text-white/20">{artistTracks.length} tracks</div>
                  </motion.div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function EmptyState({
  onAddFolder,
  isLoading
}: {
  onAddFolder: () => void
  isLoading: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-8">
          <FolderOpen className="w-16 h-16 text-primary/40" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Your music library is empty</h2>
        <p className="text-white/40 mb-8 max-w-md">
          Add a folder containing your music files to get started.
          <br />
          Supports MP3, FLAC, WAV, OGG, MP4, and more.
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddFolder}
          disabled={isLoading}
          className="flex items-center gap-2 px-8 py-3 bg-primary rounded-full text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              Scanning...
            </>
          ) : (
            <>
              <FolderOpen className="w-5 h-5" />
              Add Music Folder
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  )
}
