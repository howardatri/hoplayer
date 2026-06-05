import { useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1, ListMusic, Mic2 } from 'lucide-react'
import CoverArt from './CoverArt'
import AudioSpectrum from './AudioSpectrum'
import { usePlayer } from '@/hooks/usePlayer'

interface PlayerBarProps {
  onToggleLyrics?: () => void
  lyricsOpen?: boolean
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function PlayerBar({ onToggleLyrics, lyricsOpen }: PlayerBarProps) {
  const { currentTrack, isPlaying, volume, progress, currentTime, duration, repeatMode, isShuffle, togglePlay, playNext, playPrev, seek, setVolume, toggleRepeat, toggleShuffle } = usePlayer()
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }, [seek])

  const handleVolumeClick = useCallback((e: React.MouseEvent) => {
    const rect = volumeRef.current?.getBoundingClientRect()
    if (!rect) return
    setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }, [setVolume])

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  const btnStyle = (active = false): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    color: active ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s'
  })

  return (
    <div style={{ height: 80, flexShrink: 0, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(40px)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      {/* Progress bar */}
      <div ref={progressRef} onClick={handleProgressClick} style={{ height: 4, cursor: 'pointer', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress * 100}%`, background: 'var(--color-primary, #6366f1)' }} />
      </div>

      {/* Controls */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16 }}>
        {/* Track info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 256, minWidth: 0, overflow: 'hidden' }}>
          {currentTrack ? (
            <>
              <CoverArt filePath={currentTrack.filePath} size="md" isPlaying={isPlaying} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist}</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>No track playing</div>
          )}
        </div>

        {/* Center controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={btnStyle(isShuffle)} onClick={toggleShuffle}><Shuffle size={16} /></button>
            <button style={btnStyle()} onClick={playPrev}><SkipBack size={20} fill="currentColor" /></button>
            <button
              onClick={togglePlay}
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', color: 'black', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button style={btnStyle()} onClick={playNext}><SkipForward size={20} fill="currentColor" /></button>
            <button style={btnStyle(repeatMode !== 'off')} onClick={toggleRepeat}><RepeatIcon size={16} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 40, textAlign: 'right' }}>{formatTime(currentTime)}</span>
            <AudioSpectrum width={120} height={16} style="bars" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 40 }}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 192, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={btnStyle()} onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
              <VolumeIcon size={16} />
            </button>
            <div ref={volumeRef} onClick={handleVolumeClick} style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${volume * 100}%`, background: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
            </div>
          </div>
          {onToggleLyrics && (
            <button style={btnStyle(lyricsOpen)} onClick={onToggleLyrics}><Mic2 size={16} /></button>
          )}
          <button style={btnStyle()}><ListMusic size={16} /></button>
        </div>
      </div>
    </div>
  )
}
