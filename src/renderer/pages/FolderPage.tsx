import { useMemo, useCallback, useState } from 'react'
import { FolderOpen, Play, Trash2, Music, ArrowLeft, FolderSearch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLibrary } from '@/hooks/useLibrary'
import { usePlayer } from '@/hooks/usePlayer'
import TrackList from '@/components/TrackList'
import { getTrackFolder, getFolderDisplayName, groupTracksByFolder } from '@/utils/paths'
import type { Track } from '@shared/index'

interface FolderPageProps {
  onNavigate?: (page: string) => void
  initialFolder?: string
}

export default function FolderPage({ onNavigate, initialFolder }: FolderPageProps) {
  const { tracks, scanPaths, addDirectory, removeDirectory, isLoading } = useLibrary()
  const { playTrack } = usePlayer()
  const [activeFolder, setActiveFolder] = useState<string | null>(initialFolder || null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Group tracks by folder
  const folderMap = useMemo(() => groupTracksByFolder(tracks, scanPaths), [tracks, scanPaths])

  // Tracks for the currently active folder
  const folderTracks = useMemo(() => {
    if (!activeFolder) return []
    return folderMap.get(activeFolder) || []
  }, [folderMap, activeFolder])

  const handlePlayFolder = (folder: string) => {
    const ft = folderMap.get(folder) || []
    if (ft.length > 0) playTrack(ft[0], ft)
  }

  const handlePlayTrack = useCallback((track: Track) => playTrack(track, folderTracks), [playTrack, folderTracks])

  const handleDeleteFolder = (path: string) => {
    removeDirectory(path)
    setConfirmDelete(null)
    if (activeFolder === path) setActiveFolder(null)
  }

  // If viewing a specific folder
  if (activeFolder) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Folder header */}
        <div style={{ padding: '24px 32px 16px' }}>
          <button
            onClick={() => setActiveFolder(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}
          >
            <ArrowLeft size={16} />
            All Folders
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{getFolderDisplayName(activeFolder)}</h1>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{activeFolder}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handlePlayFolder(activeFolder)}
                disabled={folderTracks.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))', color: 'var(--color-text)', border: 'none', borderRadius: 9999, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
              >
                <Play size={14} fill="currentColor" />
                Play All
              </button>
              <button
                onClick={() => setConfirmDelete(activeFolder)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'color-mix(in srgb, #ef4444 10%, transparent)', color: '#ef4444', border: '1px solid color-mix(in srgb, #ef4444 20%, transparent)', borderRadius: 9999, fontSize: 13, cursor: 'pointer' }}
              >
                <Trash2 size={14} />
                Remove Folder
              </button>
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <TrackList tracks={folderTracks} onPlayTrack={handlePlayTrack} showAlbum onNavigate={onNavigate} />
        </div>

        {/* Delete confirmation */}
        <AnimatePresence>
          {confirmDelete && (
            <ConfirmDialog
              title="Remove Folder"
              message={`Remove "${getFolderDisplayName(confirmDelete)}" and its ${folderMap.get(confirmDelete)?.length || 0} tracks from the library?`}
              confirmLabel="Remove"
              onConfirm={() => handleDeleteFolder(confirmDelete)}
              onCancel={() => setConfirmDelete(null)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Folder grid view
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Folders</h1>
          <button
            onClick={addDirectory}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)', borderRadius: 9999, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            <FolderOpen size={14} />
            Add Folder
          </button>
        </div>

        {scanPaths.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--color-text-muted)' }}>
            <FolderSearch size={56} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No folders yet</p>
            <p style={{ fontSize: 13, marginBottom: 24 }}>Add a music folder to get started</p>
            <button
              onClick={addDirectory}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))', color: 'var(--color-text)', border: 'none', borderRadius: 9999, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
            >
              <FolderOpen size={16} />
              Add Folder
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {scanPaths.map(path => {
              const folderTracks = folderMap.get(path) || []
              const displayName = getFolderDisplayName(path)
              return (
                <div
                  key={path}
                  style={{
                    padding: 20,
                    borderRadius: 14,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setActiveFolder(path)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--color-surface-hover)'
                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--color-surface)'
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 20%, transparent), color-mix(in srgb, var(--color-accent) 10%, transparent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={22} style={{ color: 'color-mix(in srgb, var(--color-primary) 70%, transparent)' }} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(path) }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 10 }}>{path}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <Music size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                      {folderTracks.length} tracks
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePlayFolder(path) }}
                      disabled={folderTracks.length === 0}
                      style={{ marginLeft: 'auto', background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'var(--color-primary-light, #9b82f8)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Play size={10} fill="currentColor" />
                      Play
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            title="Remove Folder"
            message={`Remove "${getFolderDisplayName(confirmDelete)}" and its ${folderMap.get(confirmDelete)?.length || 0} tracks from the library?`}
            confirmLabel="Remove"
            onConfirm={() => handleDeleteFolder(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Confirmation dialog component
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 380, padding: 24,
          background: 'color-mix(in srgb, var(--color-bg) 98%, transparent)',
          backdropFilter: 'blur(40px)',
          border: '1px solid color-mix(in srgb, var(--color-primary) 14%, transparent)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, border: 'none', background: 'color-mix(in srgb, #ef4444 15%, transparent)', color: '#ef4444', cursor: 'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
