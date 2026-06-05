import { useRef, useCallback, useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1, ListMusic, Mic2 } from 'lucide-react'
import CoverArt from './CoverArt'
import AudioSpectrum from './AudioSpectrum'
import { usePlayer } from '@/hooks/usePlayer'
import usePlayerStore from '@/store/playerStore'

interface PlayerBarProps {
  onToggleLyrics?: () => void
  lyricsOpen?: boolean
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlayerBar({ onToggleLyrics, lyricsOpen }: PlayerBarProps) {
  const { togglePlay, playNext, playPrev, seek, setVolume } = usePlayer()
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const volume = usePlayerStore(s => s.volume)
  const progress = usePlayerStore(s => s.progress)
  const currentTime = usePlayerStore(s => s.currentTime)
  const duration = usePlayerStore(s => s.duration)
  const repeatMode = usePlayerStore(s => s.repeatMode)
  const isShuffle = usePlayerStore(s => s.isShuffle)
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat)
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle)

  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)

  // ---- Progress bar drag-to-seek ----
  const getProgressFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }, [])

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const p = getProgressFromEvent(e)
    setIsDragging(true)
    setDragProgress(p)
  }, [getProgressFromEvent])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      setDragProgress(getProgressFromEvent(e))
    }

    const handleMouseUp = (e: MouseEvent) => {
      const p = getProgressFromEvent(e)
      setIsDragging(false)
      seek(p)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, getProgressFromEvent, seek])

  // ---- Volume bar click ----
  const handleVolumeClick = useCallback((e: React.MouseEvent) => {
    const rect = volumeRef.current?.getBoundingClientRect()
    if (!rect) return
    setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }, [setVolume])

  // ---- Keyboard volume gesture ----
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Only if hovering over the player bar area
      const target = e.target as HTMLElement
      if (!target.closest('[data-player-bar]')) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      setVolume(usePlayerStore.getState().volume + delta)
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [setVolume])

  const displayProgress = isDragging ? dragProgress : progress
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  const iconBtn = (active = false): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
    color: active ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.15s'
  })

  return (
    <div data-player-bar style={{
      height: 80, flexShrink: 0,
      background: 'rgba(15,15,20,0.85)', backdropFilter: 'blur(40px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', zIndex: 50
    }}>
      {/* Progress bar — clickable + draggable */}
      <div
        ref={progressRef}
        onMouseDown={handleProgressMouseDown}
        style={{
          height: 6, cursor: 'pointer', position: 'relative',
          background: 'rgba(255,255,255,0.08)',
          transition: 'height 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.height = '10px'}
        onMouseLeave={e => { if (!isDragging) e.currentTarget.style.height = '6px' }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${displayProgress * 100}%`,
          background: 'var(--color-primary, #6366f1)',
          transition: isDragging ? 'none' : 'width 0.1s linear'
        }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
          left: `${displayProgress * 100}%`,
          width: isDragging ? 14 : 10, height: isDragging ? 14 : 10,
          borderRadius: '50%', background: 'white',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
          opacity: isDragging ? 1 : 0, transition: 'opacity 0.15s, width 0.15s, height 0.15s',
          pointerEvents: 'none'
        }} />
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
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)' }}>No track playing</div>
          )}
        </div>

        {/* Center */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={iconBtn(isShuffle)} onClick={toggleShuffle} title="Shuffle"><Shuffle size={16} /></button>
            <button style={iconBtn()} onClick={playPrev} title="Previous"><SkipBack size={20} fill="currentColor" /></button>
            <button onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'} style={{
              width: 40, height: 40, borderRadius: '50%', background: 'white', color: 'black',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.1s'
            }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button style={iconBtn()} onClick={playNext} title="Next"><SkipForward size={20} fill="currentColor" /></button>
            <button style={iconBtn(repeatMode !== 'off')} onClick={toggleRepeat} title={`Repeat: ${repeatMode}`}><RepeatIcon size={16} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatTime(currentTime)}</span>
            <AudioSpectrum width={120} height={16} style="bars" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 40, fontVariantNumeric: 'tabular-nums' }}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 192, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={iconBtn()} onClick={() => setVolume(volume === 0 ? 0.8 : 0)} title="Mute"><VolumeIcon size={16} /></button>
            <div ref={volumeRef} onClick={handleVolumeClick} style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${volume * 100}%`, background: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', width: 30, fontVariantNumeric: 'tabular-nums' }}>{Math.round(volume * 100)}%</span>
          </div>
          {onToggleLyrics && (
            <button style={iconBtn(lyricsOpen)} onClick={onToggleLyrics} title="Lyrics"><Mic2 size={16} /></button>
          )}
          <button style={iconBtn()} title="Queue"><ListMusic size={16} /></button>
        </div>
      </div>
    </div>
  )
}
