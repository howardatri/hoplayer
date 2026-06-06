import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pencil, Save, RotateCcw, Music, Film, Clock, HardDrive, FileAudio, Image, Loader2 } from 'lucide-react'
import CoverArt from './CoverArt'
import useLibraryStore from '@/store/libraryStore'
import useToastStore from '@/store/toastStore'
import type { Track } from '@shared/index'

interface TrackPropertiesDialogProps {
  track: Track | null
  onClose: () => void
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function getFileExtension(path: string): string {
  return path.split('.').pop()?.toUpperCase() || 'UNKNOWN'
}

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path
}

interface EditData {
  title: string
  artist: string
  album: string
  genre: string
  year: string
  trackNumber: string
}

export default function TrackPropertiesDialog({ track, onClose }: TrackPropertiesDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState<EditData>({
    title: '', artist: '', album: '', genre: '', year: '', trackNumber: ''
  })
  const [fetchingCover, setFetchingCover] = useState(false)
  const [fetchedCoverUrl, setFetchedCoverUrl] = useState<string | null>(null)

  const updateTrack = useLibraryStore((s) => s.updateTrack)
  const addToast = useToastStore((s) => s.addToast)

  const enterEditMode = useCallback(() => {
    if (!track) return
    setEditData({
      title: track.title || '',
      artist: track.artist || '',
      album: track.album || '',
      genre: track.genre || '',
      year: track.year ? String(track.year) : '',
      trackNumber: track.trackNumber ? String(track.trackNumber) : ''
    })
    setIsEditing(true)
  }, [track])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!track) return
    if (!editData.title.trim()) {
      addToast('Title cannot be empty', 'error')
      return
    }
    if (!editData.artist.trim()) {
      addToast('Artist cannot be empty', 'error')
      return
    }

    setIsSaving(true)
    try {
      const tags: Partial<Track> = {
        title: editData.title.trim(),
        artist: editData.artist.trim(),
        album: editData.album.trim() || 'Unknown Album',
        genre: editData.genre.trim() || undefined,
        year: editData.year ? parseInt(editData.year, 10) : undefined,
        trackNumber: editData.trackNumber ? parseInt(editData.trackNumber, 10) : undefined
      }

      // Write tags to file
      const success = await window.electronAPI.writeTrackTag(track.filePath, tags)

      if (!success) {
        addToast('Failed to write tags to file. Only MP3 files are currently supported.', 'error')
        setIsSaving(false)
        return
      }

      // Update track in store and DB
      const updatedTrack: Track = { ...track, ...tags }
      updateTrack(track.id, tags)
      await window.electronAPI.updateTrackDb(updatedTrack)

      addToast('Tags saved successfully', 'success')
      setIsEditing(false)
    } catch (e) {
      console.error('Failed to save tags:', e)
      addToast('Failed to save tags', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [track, editData, updateTrack, addToast])

  const handleFetchCover = useCallback(async () => {
    if (!track) return
    setFetchingCover(true)
    setFetchedCoverUrl(null)
    try {
      const result = await window.electronAPI.fetchOnlineCover(track.artist, track.album)
      if (result) {
        setFetchedCoverUrl(result)
        addToast('Cover art found', 'success')
      } else {
        addToast('No cover art found for this album', 'info')
      }
    } catch (e) {
      console.error('Failed to fetch online cover:', e)
      addToast('Failed to fetch cover art', 'error')
    } finally {
      setFetchingCover(false)
    }
  }, [track, addToast])

  if (!track) return null

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'inherit'
  }

  const inputFocusStyle = '1px solid color-mix(in srgb, var(--color-primary) 50%, transparent)'

  const viewRows = [
    { label: 'Title', value: track.title },
    { label: 'Artist', value: track.artist },
    { label: 'Album', value: track.album },
    ...(track.genre ? [{ label: 'Genre', value: track.genre }] : []),
    ...(track.year ? [{ label: 'Year', value: String(track.year) }] : []),
    ...(track.trackNumber ? [{ label: 'Track', value: String(track.trackNumber) }] : []),
    ...(track.bitrate ? [{ label: 'Bitrate', value: `${track.bitrate} kbps` }] : []),
    { label: 'Duration', value: formatDuration(track.duration) },
    { label: 'Format', value: getFileExtension(track.filePath) },
    { label: 'Type', value: track.format === 'video' ? 'Video' : 'Audio' },
    { label: 'File', value: getFileName(track.filePath), mono: true },
    { label: 'Path', value: track.filePath, mono: true },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 420, maxHeight: '80vh', overflowY: 'auto',
            background: 'color-mix(in srgb, var(--color-bg) 98%, transparent)',
            backdropFilter: 'blur(40px)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            padding: 24
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
              {isEditing ? 'Edit Tags' : 'Track Properties'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {!isEditing && track.format === 'audio' && (
                <button
                  onClick={enterEditMode}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    padding: 4, display: 'flex',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'color-mix(in srgb, var(--color-primary) 80%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                  title="Edit tags"
                >
                  <Pencil size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                  padding: 4, display: 'flex'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Cover + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <CoverArt filePath={track.filePath} size="md" />
            <div style={{ minWidth: 0, flex: 1 }}>
              {isEditing ? (
                <input
                  value={editData.title}
                  onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                  placeholder="Title"
                  style={{ ...inputStyle, fontSize: 16, fontWeight: 600, display: 'block', width: '100%', marginBottom: 4 }}
                  onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
                  onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {track.title}
                </div>
              )}
              {isEditing ? (
                <input
                  value={editData.artist}
                  onChange={e => setEditData(d => ({ ...d, artist: e.target.value }))}
                  placeholder="Artist"
                  style={{ ...inputStyle, fontSize: 13, display: 'block', width: '100%' }}
                  onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
                  onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                />
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{track.artist}</div>
              )}
            </div>
          </div>

          {/* Fetch Online Cover Art */}
          {!isEditing && track.artist !== 'Unknown Artist' && track.album !== 'Unknown Album' && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handleFetchCover}
                disabled={fetchingCover}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 13, color: 'var(--color-text-secondary)',
                  cursor: fetchingCover ? 'wait' : 'pointer',
                  transition: 'color 0.15s, border-color 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--color-text)'
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--color-primary) 40%, transparent)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                {fetchingCover ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
                {fetchingCover ? 'Searching...' : 'Fetch Cover Art Online'}
              </button>
              {fetchedCoverUrl && (
                <>
                  <div style={{
                    marginTop: 12,
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <img
                      src={fetchedCoverUrl}
                      alt="Online cover art"
                      style={{
                        width: 100, height: 100,
                        borderRadius: 8,
                        objectFit: 'cover',
                        border: '1px solid var(--color-border)'
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                        Found online cover art from Cover Art Archive
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {track.artist} - {track.album}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={async () => {
                        if (!fetchedCoverUrl || !track) return
                        try {
                          const success = await window.electronAPI.saveCoverFile(track.filePath, fetchedCoverUrl)
                          if (success) {
                            addToast('Cover art saved to file', 'success')
                          } else {
                            addToast('Failed to save cover art', 'error')
                          }
                        } catch (e) {
                          addToast('Failed to save cover art', 'error')
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 12, color: 'var(--color-text)',
                        cursor: 'pointer'
                      }}
                    >
                      <Save size={12} />
                      Save to File
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Properties */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {isEditing ? (
              <>
                {/* Editable fields */}
                <EditRow label="Album">
                  <input
                    value={editData.album}
                    onChange={e => setEditData(d => ({ ...d, album: e.target.value }))}
                    placeholder="Album"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
                    onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                  />
                </EditRow>
                <EditRow label="Genre">
                  <input
                    value={editData.genre}
                    onChange={e => setEditData(d => ({ ...d, genre: e.target.value }))}
                    placeholder="Genre"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
                    onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                  />
                </EditRow>
                <EditRow label="Year">
                  <input
                    type="number"
                    value={editData.year}
                    onChange={e => setEditData(d => ({ ...d, year: e.target.value }))}
                    placeholder="Year"
                    style={{ ...inputStyle, width: 100 }}
                    onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
                    onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                  />
                </EditRow>
                <EditRow label="Track #">
                  <input
                    type="number"
                    value={editData.trackNumber}
                    onChange={e => setEditData(d => ({ ...d, trackNumber: e.target.value }))}
                    placeholder="Number"
                    style={{ ...inputStyle, width: 100 }}
                    onFocus={e => (e.currentTarget.style.border = inputFocusStyle)}
                    onBlur={e => (e.currentTarget.style.border = '1px solid var(--color-border)')}
                  />
                </EditRow>
                {/* Read-only info */}
                <ReadOnlyRow label="Duration" value={formatDuration(track.duration)} />
                <ReadOnlyRow label="Format" value={getFileExtension(track.filePath)} />
                <ReadOnlyRow label="Type" value={track.format === 'video' ? 'Video' : 'Audio'} />
                <ReadOnlyRow label="File" value={getFileName(track.filePath)} mono />
                <ReadOnlyRow label="Path" value={track.filePath} mono last />
              </>
            ) : (
              viewRows.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < viewRows.length - 1 ? '1px solid var(--color-surface)' : 'none'
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 64, flexShrink: 0 }}>{row.label}</span>
                  <span style={{
                    fontSize: 13, color: 'var(--color-text)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: row.mono ? 'monospace' : 'inherit'
                  }}>
                    {row.value}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Action buttons */}
          {isEditing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                onClick={cancelEdit}
                disabled={isSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13, color: 'var(--color-text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13, color: 'color-mix(in srgb, var(--color-primary) 90%, transparent)',
                  cursor: isSaving ? 'wait' : 'pointer'
                }}
              >
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}

          {/* MP3 only hint when editing */}
          {isEditing && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 12 }}>
              Tag editing is currently supported for MP3 files only
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function EditRow({ label, children }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 0',
      borderBottom: '1px solid var(--color-surface)'
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 64, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  )
}

function ReadOnlyRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12,
      padding: '8px 0',
      borderBottom: last ? 'none' : '1px solid var(--color-surface)'
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 64, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, color: 'var(--color-text-secondary)', flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: mono ? 'monospace' : 'inherit'
      }}>
        {value}
      </span>
    </div>
  )
}
