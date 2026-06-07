import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Trash2, ListMusic } from 'lucide-react'
import CoverArt from './CoverArt'
import usePlayerStore from '@/store/playerStore'
import { getPlayerControls } from '@/hooks/usePlayer'
import type { Track } from '@shared/index'

interface QueuePanelProps {
  isOpen: boolean
  onClose: () => void
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)

  const handlePlayTrack = (track: Track, index: number) => {
    usePlayerStore.setState({ currentIndex: index })
    getPlayerControls()?.playTrack(track)
  }

  // Split queue into "now playing" + "next up"
  const upNext = queue.slice(currentIndex + 1)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{
            width: 320, height: '100%', flexShrink: 0,
            background: 'color-mix(in srgb, var(--color-bg) 95%, transparent)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListMusic size={16} style={{ color: 'var(--color-text-secondary)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Queue</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{queue.length} tracks</span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {/* Now Playing */}
            {currentTrack && (
              <div style={{ padding: '0 16px 8px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Now Playing
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
                  <CoverArt filePath={currentTrack.filePath} size="sm" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary, #7c5bf5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTrack.artist}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatDuration(currentTrack.duration)}</span>
                </div>
              </div>
            )}

            {/* Next Up */}
            {upNext.length > 0 && (
              <div style={{ padding: '0 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 8 }}>
                  Next Up
                </div>
                {upNext.map((track, i) => {
                  const queueIndex = currentIndex + 1 + i
                  return (
                    <div
                      key={`${track.id}-${queueIndex}`}
                      className="group"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 10px', borderRadius: 8,
                        cursor: 'pointer', transition: 'background 0.1s'
                      }}
                      onClick={() => handlePlayTrack(track, queueIndex)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <CoverArt filePath={track.filePath} size="sm" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromQueue(queueIndex) }}
                        className="opacity-0 group-hover:opacity-100"
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'opacity 0.15s' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {queue.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', color: 'var(--color-text-muted)' }}>
                <ListMusic size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 13 }}>Queue is empty</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Play a track to fill the queue</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
