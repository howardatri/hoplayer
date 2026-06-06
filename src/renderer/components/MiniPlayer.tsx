import { Play, Pause, SkipBack, SkipForward, Music, Maximize2 } from 'lucide-react'
import { getPlayerControls } from '@/hooks/usePlayer'
import usePlayerStore from '@/store/playerStore'
import { useCoverArt } from '@/hooks/useCoverArt'

function MiniCoverArt({ filePath }: { filePath?: string }) {
  const { coverUrl } = useCoverArt(filePath)
  return (
    <div style={{
      width: 60, height: 60, borderRadius: 8, overflow: 'hidden',
      background: 'var(--color-surface)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {coverUrl ? (
        <img src={coverUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Music size={20} style={{ color: 'var(--color-border)' }} />
      )}
    </div>
  )
}

export default function MiniPlayer() {
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)

  const handleTogglePlay = () => getPlayerControls()?.togglePlay()
  const handleNext = () => getPlayerControls()?.playNext()
  const handlePrev = () => getPlayerControls()?.playPrev()

  const iconBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
    color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', WebkitAppRegion: 'no-drag' as any
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px', WebkitAppRegion: 'drag' as any,
      userSelect: 'none', overflow: 'hidden'
    }}>
      <MiniCoverArt filePath={currentTrack?.filePath} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--color-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {currentTrack?.title || 'No track'}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--color-text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {currentTrack?.artist || ''}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          style={iconBtnStyle}
          onClick={() => window.electronAPI.toggleMiniPlayer()}
          title="Exit Mini Player"
        >
          <Maximize2 size={14} />
        </button>
        <button style={iconBtnStyle} onClick={handlePrev} title="Previous">
          <SkipBack size={16} fill="currentColor" />
        </button>
        <button
          onClick={handleTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
            color: 'var(--color-text)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            WebkitAppRegion: 'no-drag' as any
          }}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 1 }} />}
        </button>
        <button style={iconBtnStyle} onClick={handleNext} title="Next">
          <SkipForward size={16} fill="currentColor" />
        </button>
      </div>
    </div>
  )
}
