import { useMemo, useCallback } from 'react'
import { Play, Shuffle, ArrowLeft, User, Disc3 } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import { usePlayer } from '@/hooks/usePlayer'
import TrackList from '@/components/TrackList'
import CoverArt from '@/components/CoverArt'
import type { Track } from '@shared/index'

interface ArtistPageProps {
  artistName: string
  onNavigate?: (page: string) => void
}

interface AlbumPageProps {
  albumName: string
  onNavigate?: (page: string) => void
}

export function ArtistPage({ artistName, onNavigate }: ArtistPageProps) {
  const { tracks } = useLibrary()
  const { playTrack } = usePlayer()

  const artistTracks = useMemo(
    () => tracks.filter(t => t.artist === artistName),
    [tracks, artistName]
  )

  const albums = useMemo(() => {
    const map = new Map<string, Track[]>()
    for (const t of artistTracks) {
      const key = t.album || 'Unknown Album'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries())
  }, [artistTracks])

  const handlePlayAll = () => {
    if (artistTracks.length > 0) playTrack(artistTracks[0], artistTracks)
  }

  const handleShuffle = () => {
    if (artistTracks.length === 0) return
    const shuffled = [...artistTracks].sort(() => Math.random() - 0.5)
    playTrack(shuffled[0], shuffled)
  }

  const handlePlayTrack = useCallback((track: Track) => playTrack(track, artistTracks), [playTrack, artistTracks])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => onNavigate?.('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 32 }}>
          <div style={{ width: 160, height: 160, borderRadius: '50%', background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 30%, transparent), var(--color-surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 56, fontWeight: 700, color: 'color-mix(in srgb, var(--color-primary) 50%, transparent)' }}>{artistName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Artist</p>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{artistName}</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
              {artistTracks.length} tracks · {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handlePlayAll} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'var(--color-primary, #7c5bf5)', color: 'var(--color-text)', border: 'none', borderRadius: 9999, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                <Play size={16} fill="currentColor" />
                Play All
              </button>
              <button onClick={handleShuffle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9999, fontSize: 14, cursor: 'pointer' }}>
                <Shuffle size={16} />
                Shuffle
              </button>
            </div>
          </div>
        </div>

        {/* Albums */}
        {albums.length > 1 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>Albums</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
              {albums.map(([albumName, albumTracks]) => (
                <div
                  key={albumName}
                  onClick={() => onNavigate?.(`album:${albumName}`)}
                  style={{ cursor: 'pointer', padding: 12, borderRadius: 12, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ marginBottom: 10 }}>
                    <CoverArt filePath={albumTracks[0].filePath} size="lg" className="w-full" />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{albumName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{albumTracks.length} tracks</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All tracks */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>All Tracks</h2>
          <TrackList tracks={artistTracks} onPlayTrack={handlePlayTrack} showAlbum onNavigate={onNavigate} />
        </section>
      </div>
    </div>
  )
}

export function AlbumPage({ albumName, onNavigate }: AlbumPageProps) {
  const { tracks } = useLibrary()
  const { playTrack } = usePlayer()

  const albumTracks = useMemo(
    () => tracks.filter(t => t.album === albumName),
    [tracks, albumName]
  )

  const artist = albumTracks[0]?.artist || 'Unknown'

  const handlePlayAll = () => {
    if (albumTracks.length > 0) playTrack(albumTracks[0], albumTracks)
  }

  const handlePlayTrack = useCallback((track: Track) => playTrack(track, albumTracks), [playTrack, albumTracks])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => onNavigate?.('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 32 }}>
          {albumTracks.length > 0 && (
            <div style={{ width: 160, height: 160, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              <CoverArt filePath={albumTracks[0].filePath} size="xl" />
            </div>
          )}
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Album</p>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{albumName}</h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              {artist} · {albumTracks.length} tracks
            </p>
            <button onClick={handlePlayAll} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'var(--color-primary, #7c5bf5)', color: 'var(--color-text)', border: 'none', borderRadius: 9999, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              <Play size={16} fill="currentColor" />
              Play All
            </button>
          </div>
        </div>

        {/* Tracks */}
        <TrackList tracks={albumTracks} onPlayTrack={handlePlayTrack} showIndex showAlbum={false} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
