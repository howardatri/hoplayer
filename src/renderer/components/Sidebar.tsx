import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Library as LibraryIcon, FolderOpen, ListMusic, Plus, Settings, Search, Pencil, Trash2 } from 'lucide-react'
import usePlaylistStore from '@/store/playlistStore'
import useSearchStore from '@/store/searchStore'
import ContextMenu, { useContextMenu, type ContextMenuItem } from './ContextMenu'
import type { Playlist } from '@shared/index'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  onCreatePlaylist: () => void
}

export default function Sidebar({ currentPage, onNavigate, onCreatePlaylist }: SidebarProps) {
  const playlists = usePlaylistStore((s) => s.playlists)
  const renamePlaylist = usePlaylistStore((s) => s.renamePlaylist)
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist)
  const searchQuery = useSearchStore((s) => s.query)
  const setSearchQuery = useSearchStore((s) => s.setQuery)
  const [searchFocused, setSearchFocused] = useState(false)

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: LibraryIcon },
    { id: 'folders', label: 'Folders', icon: FolderOpen }
  ]

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) onNavigate('library')
  }

  const navBtnStyle = (isActive: boolean): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500,
    border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
    background: isActive ? 'var(--color-surface-active)' : 'transparent',
    color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
  })

  return (
    <div style={{
      width: 224, height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
      flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 4px' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            width: 14, height: 14,
            color: searchFocused ? 'var(--color-primary)' : 'var(--color-text-muted)',
            transition: 'color 0.15s',
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search..."
            style={{
              width: '100%', padding: '7px 12px 7px 32px',
              background: searchFocused ? 'var(--color-surface-hover)' : 'var(--color-surface)',
              border: searchFocused ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 8, fontSize: 12, color: 'var(--color-text)', outline: 'none',
              transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
              boxShadow: searchFocused ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '8px 12px' }}>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={navBtnStyle(currentPage === id)}
            onMouseEnter={e => { if (currentPage !== id) e.currentTarget.style.background = 'var(--color-surface-hover)' }}
            onMouseLeave={e => { if (currentPage !== id) e.currentTarget.style.background = 'transparent' }}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Playlists */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 6px' }}>
          <span className="font-display" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Playlists
          </span>
          <button
            onClick={onCreatePlaylist}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4, transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.background = 'var(--color-surface-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'none' }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 8px' }}>
          {playlists.map((playlist) => (
            <PlaylistItem
              key={playlist.id}
              playlist={playlist}
              isActive={currentPage === `playlist:${playlist.id}`}
              onClick={() => onNavigate(`playlist:${playlist.id}`)}
              onRename={renamePlaylist}
              onDelete={(id) => { deletePlaylist(id); if (currentPage === `playlist:${id}`) onNavigate('home') }}
            />
          ))}
          {playlists.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center' }}>
              <ListMusic style={{ width: 28, height: 28, margin: '0 auto 8px', color: 'var(--color-text-muted)', opacity: 0.3 }} />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No playlists yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '8px 12px 16px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => onNavigate('settings')}
          style={navBtnStyle(currentPage === 'settings')}
          onMouseEnter={e => { if (currentPage !== 'settings') e.currentTarget.style.background = 'var(--color-surface-hover)' }}
          onMouseLeave={e => { if (currentPage !== 'settings') e.currentTarget.style.background = 'transparent' }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}

function PlaylistItem({ playlist, isActive, onClick, onRename, onDelete }: {
  playlist: Playlist; isActive: boolean; onClick: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(playlist.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu()

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const commitRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== playlist.name) onRename(playlist.id, trimmed)
    setEditing(false)
  }

  const menuItems: ContextMenuItem[] = [
    { label: 'Rename', icon: <Pencil size={14} />, onClick: () => { setEditValue(playlist.name); setEditing(true) } },
    { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => onDelete(playlist.id), danger: true }
  ]

  return (
    <>
      <button
        onClick={onClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); openContextMenu(e, menuItems) }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px', borderRadius: 8, fontSize: 13,
          border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
          background: isActive ? 'var(--color-surface-active)' : 'transparent',
          color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-hover)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        <ListMusic size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false) }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, fontSize: 13, padding: '2px 6px', borderRadius: 4,
              background: 'var(--color-surface-hover)', border: '1px solid var(--color-primary)',
              color: 'var(--color-text)', outline: 'none', minWidth: 0,
              boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-primary) 15%, transparent)',
            }}
          />
        ) : (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{playlist.name}</span>
        )}
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{playlist.trackIds.length}</span>
      </button>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />
        )}
      </AnimatePresence>
    </>
  )
}
