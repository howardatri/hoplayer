import { useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1, ListMusic, Mic2 } from 'lucide-react'
import CoverArt from './CoverArt'
import AudioSpectrum from './AudioSpectrum'
import Slider from './Slider'
import { usePlayer, setSeeking } from '@/hooks/usePlayer'
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

  // ---- Progress slider ----
  const handleProgressChange = useCallback((v: number) => {
    setSeeking(true) // block timeupdate during drag
    // Update visual position only (don't seek audio yet)
    usePlayerStore.getState().setProgress(v)
    if (duration && isFinite(duration)) {
      usePlayerStore.getState().setCurrentTime(v * duration)
    }
  }, [duration])

  const handleProgressCommit = useCallback((v: number) => {
    seek(v) // actually seek the audio; seek() sets _isSeeking and seeked clears it
  }, [seek])

  // ---- Volume slider ----
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v)
  }, [setVolume])

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
      {/* Progress bar */}
      <div style={{ padding: '0 16px', height: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatTime(currentTime)}
        </span>
        <Slider
          value={progress}
          onChange={handleProgressChange}
          onCommit={handleProgressCommit}
          trackHeight={4}
          thumbSize={14}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 40, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatTime(duration)}
        </span>
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

        {/* Center controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={iconBtn(isShuffle)} onClick={toggleShuffle} title="Shuffle"><Shuffle size={16} /></button>
            <button style={iconBtn()} onClick={playPrev} title="Previous"><SkipBack size={20} fill="currentColor" /></button>
            <button onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'} style={{
              width: 40, height: 40, borderRadius: '50%', background: 'white', color: 'black',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button style={iconBtn()} onClick={playNext} title="Next"><SkipForward size={20} fill="currentColor" /></button>
            <button style={iconBtn(repeatMode !== 'off')} onClick={toggleRepeat} title={`Repeat: ${repeatMode}`}><RepeatIcon size={16} /></button>
          </div>
          <AudioSpectrum width={120} height={16} style="bars" />
        </div>

        {/* Right: volume + extras */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 200, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={iconBtn()} onClick={() => setVolume(volume === 0 ? 0.8 : 0)} title="Mute">
              <VolumeIcon size={16} />
            </button>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              trackHeight={3}
              thumbSize={10}
              showThumb={false}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', width: 30, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(volume * 100)}%
            </span>
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
