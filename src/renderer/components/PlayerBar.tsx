import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1, ListMusic, Mic2, Sliders, Waves } from 'lucide-react'
import CoverArt from './CoverArt'
import AudioSpectrum from './AudioSpectrum'
import Slider from './Slider'
import ProgressSlider from './ProgressSlider'
import Equalizer from './Equalizer'
import { usePlayer } from '@/hooks/usePlayer'
import usePlayerStore from '@/store/playerStore'

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]

interface PlayerBarProps {
  onToggleLyrics?: () => void
  lyricsOpen?: boolean
  onToggleQueue?: () => void
  queueOpen?: boolean
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlayerBar({ onToggleLyrics, lyricsOpen, onToggleQueue, queueOpen }: PlayerBarProps) {
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
  const playbackSpeed = usePlayerStore(s => s.playbackSpeed)
  const setPlaybackSpeed = usePlayerStore(s => s.setPlaybackSpeed)
  const crossfadeDuration = usePlayerStore(s => s.crossfadeDuration)
  const setCrossfadeDuration = usePlayerStore(s => s.setCrossfadeDuration)
  const [showEq, setShowEq] = useState(false)

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_PRESETS.indexOf(playbackSpeed)
    const nextIdx = (idx + 1) % SPEED_PRESETS.length
    setPlaybackSpeed(SPEED_PRESETS[nextIdx])
  }, [playbackSpeed, setPlaybackSpeed])

  const CROSSFADE_PRESETS = [0, 2, 4, 6, 8]
  const cycleCrossfade = useCallback(() => {
    const idx = CROSSFADE_PRESETS.indexOf(crossfadeDuration)
    const nextIdx = (idx + 1) % CROSSFADE_PRESETS.length
    setCrossfadeDuration(CROSSFADE_PRESETS[nextIdx])
  }, [crossfadeDuration, setCrossfadeDuration])

  const handleSeek = useCallback((ratio: number) => {
    seek(ratio)
  }, [seek])

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v)
  }, [setVolume])

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  const iconBtn = (active = false): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
    color: active ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.15s, background 0.15s',
    borderRadius: 8,
  })

  const handleIconHover = (e: React.MouseEvent, active: boolean) => {
    if (!active) e.currentTarget.style.background = 'var(--color-surface-hover)'
    e.currentTarget.style.color = active ? 'var(--color-primary-light)' : 'var(--color-text)'
  }

  const handleIconLeave = (e: React.MouseEvent, active: boolean) => {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.color = active ? 'var(--color-primary-light)' : 'var(--color-text-muted)'
  }

  return (
    <div data-player-bar style={{
      height: 80, flexShrink: 0,
      background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)',
      backdropFilter: 'blur(40px)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column', zIndex: 50
    }}>
      {/* Progress bar */}
      <div style={{ padding: '0 16px', height: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatTime(currentTime)}
        </span>
        <ProgressSlider progress={progress} onSeek={handleSeek} />
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 40, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
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
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist}</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>No track playing</div>
          )}
        </div>

        {/* Center controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              style={iconBtn(isShuffle)}
              onClick={toggleShuffle}
              title="Shuffle"
              onMouseEnter={e => handleIconHover(e, isShuffle)}
              onMouseLeave={e => handleIconLeave(e, isShuffle)}
            >
              <Shuffle size={16} />
            </button>
            <button
              onClick={cycleSpeed}
              title={`Speed: ${playbackSpeed}x`}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'var(--color-surface-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.color = playbackSpeed !== 1 ? 'var(--color-primary-light)' : 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent' }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px',
                color: playbackSpeed !== 1 ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                minWidth: 32, textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s, background 0.15s',
                borderRadius: 6,
              }}
            >
              {playbackSpeed}×
            </button>
            <button
              style={iconBtn()}
              onClick={playPrev}
              title="Previous"
              onMouseEnter={e => handleIconHover(e, false)}
              onMouseLeave={e => handleIconLeave(e, false)}
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: `linear-gradient(135deg, var(--color-primary-light), var(--color-primary))`,
                color: 'var(--color-text)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary-dark) 35%, transparent)',
                transition: 'transform 0.1s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 24px color-mix(in srgb, var(--color-primary-dark) 50%, transparent)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px color-mix(in srgb, var(--color-primary-dark) 35%, transparent)' }}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button
              style={iconBtn()}
              onClick={playNext}
              title="Next"
              onMouseEnter={e => handleIconHover(e, false)}
              onMouseLeave={e => handleIconLeave(e, false)}
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button
              style={iconBtn(repeatMode !== 'off')}
              onClick={toggleRepeat}
              title={`Repeat: ${repeatMode}`}
              onMouseEnter={e => handleIconHover(e, repeatMode !== 'off')}
              onMouseLeave={e => handleIconLeave(e, repeatMode !== 'off')}
            >
              <RepeatIcon size={16} />
            </button>
            <button
              onClick={cycleCrossfade}
              title={`Crossfade: ${crossfadeDuration === 0 ? 'Off' : crossfadeDuration + 's'}`}
              onMouseEnter={e => handleIconHover(e, crossfadeDuration > 0)}
              onMouseLeave={e => handleIconLeave(e, crossfadeDuration > 0)}
              style={{
                ...iconBtn(crossfadeDuration > 0),
                position: 'relative',
                fontSize: crossfadeDuration > 0 ? 9 : 0,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <Waves size={16} />
              {crossfadeDuration > 0 && (
                <span style={{ position: 'absolute', bottom: 0, right: 0, fontSize: 8, color: 'var(--color-primary-light, #9b82f8)' }}>
                  {crossfadeDuration}
                </span>
              )}
            </button>
          </div>
          <AudioSpectrum width={120} height={16} style="bars" />
        </div>

        {/* Right: volume + extras */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 200, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              style={iconBtn()}
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              title="Mute"
              onMouseEnter={e => handleIconHover(e, false)}
              onMouseLeave={e => handleIconLeave(e, false)}
            >
              <VolumeIcon size={16} />
            </button>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              trackHeight={3}
              thumbSize={10}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 30, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
          {onToggleLyrics && (
            <button
              style={iconBtn(lyricsOpen)}
              onClick={onToggleLyrics}
              title="Lyrics"
              onMouseEnter={e => handleIconHover(e, !!lyricsOpen)}
              onMouseLeave={e => handleIconLeave(e, !!lyricsOpen)}
            >
              <Mic2 size={16} />
            </button>
          )}
          <button
            style={iconBtn(queueOpen)}
            onClick={onToggleQueue}
            title="Queue"
            onMouseEnter={e => handleIconHover(e, !!queueOpen)}
            onMouseLeave={e => handleIconLeave(e, !!queueOpen)}
          >
            <ListMusic size={16} />
          </button>
          <button
            style={iconBtn(showEq)}
            onClick={() => setShowEq(!showEq)}
            title="Equalizer"
            onMouseEnter={e => handleIconHover(e, showEq)}
            onMouseLeave={e => handleIconLeave(e, showEq)}
          >
            <Sliders size={16} />
          </button>
          {createPortal(
            <Equalizer isOpen={showEq} onClose={() => setShowEq(false)} />,
            document.body
          )}
        </div>
      </div>
    </div>
  )
}
