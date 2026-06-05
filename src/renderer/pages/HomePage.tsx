import { motion } from 'framer-motion'
import { FolderOpen, Music, Play, Clock } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import { usePlayer } from '@/hooks/usePlayer'
import CoverArt from '@/components/CoverArt'
import type { Track } from '@shared/index'

export default function HomePage() {
  const { tracks, addDirectory, isLoading } = useLibrary()
  const { playTrack } = usePlayer()

  const recentTracks = [...tracks].reverse().slice(0, 8)
  const artists = [...new Set(tracks.map(t => t.artist))].slice(0, 6)

  const handlePlayAll = () => {
    if (tracks.length > 0) playTrack(tracks[0], tracks)
  }

  if (tracks.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: 128, height: 128, borderRadius: 24, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <FolderOpen size={64} style={{ color: 'rgba(99,102,241,0.4)' }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 12 }}>Your music library is empty</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32, textAlign: 'center', maxWidth: 400 }}>
          Add a folder containing your music files to get started.<br />
          Supports MP3, FLAC, WAV, OGG, MP4, and more.
        </p>
        <button
          onClick={() => { console.log('[HomePage] Add Music Folder clicked'); addDirectory() }}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 32px',
            background: 'var(--color-primary, #6366f1)',
            color: 'white',
            border: 'none',
            borderRadius: 9999,
            fontSize: 14,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          {isLoading ? (
            <>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Scanning...
            </>
          ) : (
            <>
              <FolderOpen size={20} />
              Add Music Folder
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 40 }}>
          <div style={{ width: 192, height: 192, borderRadius: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(99,102,241,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Music size={80} style={{ color: 'rgba(99,102,241,0.4)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: 'white', marginBottom: 8 }}>Music Library</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{tracks.length} tracks · {artists.length} artists</p>
            <button
              onClick={handlePlayAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                background: 'var(--color-primary, #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: 9999,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Play size={16} fill="currentColor" />
              Play All
            </button>
          </div>
        </div>

        {/* Recently Added */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
            Recently Added
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {recentTracks.map((track, i) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, tracks)}
                style={{ cursor: 'pointer', padding: 12, borderRadius: 12, transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ marginBottom: 12, position: 'relative' }}>
                  <CoverArt filePath={track.filePath} size="lg" className="w-full" />
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{track.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Artists */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 16 }}>Artists</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {artists.map((artist) => {
              const artistTracks = tracks.filter(t => t.artist === artist)
              return (
                <div
                  key={artist}
                  onClick={() => playTrack(artistTracks[0], artistTracks)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{artist.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{artist}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{artistTracks.length} tracks</div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
