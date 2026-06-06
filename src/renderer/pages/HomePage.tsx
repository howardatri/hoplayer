import { motion } from 'framer-motion'
import { FolderOpen, Music, Play, Clock, History } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import { usePlayer } from '@/hooks/usePlayer'
import CoverArt from '@/components/CoverArt'
import type { Track } from '@shared/index'

interface HomePageProps {
  onNavigate?: (page: string) => void
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { tracks, addDirectory, isLoading } = useLibrary()
  const { playTrack } = usePlayer()

  const recentTracks = [...tracks].reverse().slice(0, 8)
  const recentlyPlayed = tracks
    .filter(t => t.lastPlayed && t.lastPlayed > 0)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .slice(0, 8)
  const artists = [...new Set(tracks.map(t => t.artist))].slice(0, 6)

  const handlePlayAll = () => {
    if (tracks.length > 0) playTrack(tracks[0], tracks)
  }

  if (tracks.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{ width: 128, height: 128, borderRadius: 24, background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 20%, transparent), color-mix(in srgb, var(--color-accent) 8%, transparent))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}
        >
          <FolderOpen size={64} style={{ color: 'color-mix(in srgb, var(--color-primary) 50%, transparent)' }} />
        </motion.div>
        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>Your music library is empty</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
          Add a folder containing your music files to get started.<br />
          Supports MP3, FLAC, WAV, OGG, MP4, and more.
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { console.log('[HomePage] Add Music Folder clicked'); addDirectory() }}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 32px',
            background: 'var(--color-primary)',
            color: 'var(--color-text)',
            border: 'none',
            borderRadius: 9999,
            fontSize: 14,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary) 25%, transparent)',
          }}
        >
          {isLoading ? (
            <>
              <div style={{ width: 20, height: 20, border: '2px solid var(--color-text-muted)', borderTopColor: 'var(--color-text)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Scanning...
            </>
          ) : (
            <>
              <FolderOpen size={20} />
              Add Music Folder
            </>
          )}
        </motion.button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 40 }}
        >
          <div style={{ width: 192, height: 192, borderRadius: 16, background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 25%, transparent), color-mix(in srgb, var(--color-accent) 10%, transparent))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 40px color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
            <Music size={80} style={{ color: 'color-mix(in srgb, var(--color-primary) 50%, transparent)' }} />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-0.02em' }}>Music Library</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>{tracks.length} tracks · {artists.length} artists</p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePlayAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent)',
                color: 'var(--color-text)',
                border: 'none',
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Play size={16} fill="currentColor" />
              Play All
            </motion.button>
          </div>
        </motion.div>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={18} style={{ color: 'var(--color-text-muted)' }} />
              最近播放
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {recentlyPlayed.map((track, i) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  onClick={() => playTrack(track, tracks)}
                  className="hover-lift"
                  style={{ cursor: 'pointer', padding: 12, borderRadius: 12, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ marginBottom: 12, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                    <CoverArt filePath={track.filePath} size="lg" className="w-full" />
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{track.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Recently Added */}
        <section style={{ marginBottom: 40 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: 'var(--color-text-muted)' }} />
            Recently Added
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {recentTracks.map((track, i) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => playTrack(track, tracks)}
                className="hover-lift"
                style={{ cursor: 'pointer', padding: 12, borderRadius: 12, transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ marginBottom: 12, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                  <CoverArt filePath={track.filePath} size="lg" className="w-full" />
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{track.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Artists */}
        <section>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>Artists</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {artists.map((artist, i) => {
              const artistTracks = tracks.filter(t => t.artist === artist)
              return (
                <motion.div
                  key={artist}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => onNavigate?.(`artist:${artist}`)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s, transform 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-border), var(--color-surface-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{artist.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{artist}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{artistTracks.length} tracks</div>
                </motion.div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
