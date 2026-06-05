import { motion } from 'framer-motion'
import {
  Home,
  Library as LibraryIcon,
  ListMusic,
  Plus,
  Settings,
  FolderOpen
} from 'lucide-react'
import usePlaylistStore from '@/store/playlistStore'
import type { Playlist } from '@shared/index'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  onCreatePlaylist: () => void
}

export default function Sidebar({ currentPage, onNavigate, onCreatePlaylist }: SidebarProps) {
  const playlists = usePlaylistStore((s) => s.playlists)

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: LibraryIcon }
  ]

  return (
    <div className="w-56 h-full flex flex-col bg-black/20 border-r border-white/5">
      {/* Main navigation */}
      <div className="px-3 pt-4 pb-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Playlists section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-2">
          <span className="text-xs font-medium text-white/30 uppercase tracking-wider">
            Playlists
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCreatePlaylist}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {playlists.map((playlist) => (
            <PlaylistItem
              key={playlist.id}
              playlist={playlist}
              isActive={currentPage === `playlist:${playlist.id}`}
              onClick={() => onNavigate(`playlist:${playlist.id}`)}
            />
          ))}

          {playlists.length === 0 && (
            <div className="px-3 py-4 text-center">
              <ListMusic className="w-8 h-8 mx-auto text-white/10 mb-2" />
              <p className="text-xs text-white/20">No playlists yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="px-3 pb-4 border-t border-white/5 pt-2">
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentPage === 'settings'
              ? 'bg-white/10 text-white'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </motion.button>
      </div>
    </div>
  )
}

function PlaylistItem({
  playlist,
  isActive,
  onClick
}: {
  playlist: Playlist
  isActive: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
      }`}
    >
      <ListMusic className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{playlist.name}</span>
      <span className="text-xs text-white/20 ml-auto">{playlist.trackIds.length}</span>
    </motion.button>
  )
}
