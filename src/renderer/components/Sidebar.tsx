import { motion } from 'framer-motion'
import { Home, Library as LibraryIcon, ListMusic, Plus, Settings, Search } from 'lucide-react'
import usePlaylistStore from '@/store/playlistStore'
import useSearchStore from '@/store/searchStore'
import type { Playlist } from '@shared/index'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  onCreatePlaylist: () => void
}

export default function Sidebar({ currentPage, onNavigate, onCreatePlaylist }: SidebarProps) {
  const playlists = usePlaylistStore((s) => s.playlists)
  const searchQuery = useSearchStore((s) => s.query)
  const setSearchQuery = useSearchStore((s) => s.setQuery)

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: LibraryIcon }
  ]

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) onNavigate('library')
  }

  return (
    <div style={{
      width: 224,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(0,0,0,0.2)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      flexShrink: 0
    }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 4px' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.25)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              padding: '6px 12px 6px 32px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 8,
              fontSize: 12,
              color: 'white',
              outline: 'none'
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
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
              background: currentPage === id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: currentPage === id ? 'white' : 'rgba(255,255,255,0.5)'
            }}
            onMouseEnter={e => { if (currentPage !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (currentPage !== id) e.currentTarget.style.background = 'transparent' }}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Playlists */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Playlists
          </span>
          <button
            onClick={onCreatePlaylist}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
          {playlists.map((playlist) => (
            <PlaylistItem
              key={playlist.id}
              playlist={playlist}
              isActive={currentPage === `playlist:${playlist.id}`}
              onClick={() => onNavigate(`playlist:${playlist.id}`)}
            />
          ))}
          {playlists.length === 0 && (
            <div style={{ padding: '16px 12px', textAlign: 'center' }}>
              <ListMusic style={{ width: 32, height: 32, margin: '0 auto 8px', color: 'rgba(255,255,255,0.1)' }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No playlists yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div style={{ padding: '8px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => onNavigate('settings')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s',
            background: currentPage === 'settings' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentPage === 'settings' ? 'white' : 'rgba(255,255,255,0.5)'
          }}
          onMouseEnter={e => { if (currentPage !== 'settings') e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { if (currentPage !== 'settings') e.currentTarget.style.background = 'transparent' }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}

function PlaylistItem({ playlist, isActive, onClick }: { playlist: Playlist; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 14,
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: isActive ? 'white' : 'rgba(255,255,255,0.4)'
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <ListMusic size={14} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{playlist.name}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{playlist.trackIds.length}</span>
    </button>
  )
}
