import { useState } from 'react'
import { FolderOpen, Trash2, Plus, Volume2, Keyboard, Info, RefreshCw } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import usePlayerStore from '@/store/playerStore'

export default function SettingsPage() {
  const { tracks, scanPaths, addDirectory, removeDirectory, isLoading, scanDirectory } = useLibrary()
  const volume = usePlayerStore(s => s.volume)
  const setVolume = usePlayerStore(s => s.setVolume)
  const [scanning, setScanning] = useState<string | null>(null)

  const handleRescan = async (path: string) => {
    setScanning(path)
    await scanDirectory(path)
    setScanning(null)
  }

  const shortcuts = [
    { key: 'Space', action: 'Play / Pause' },
    { key: 'Ctrl + →', action: 'Next track' },
    { key: 'Ctrl + ←', action: 'Previous track' },
    { key: 'Ctrl + ↑', action: 'Volume up' },
    { key: 'Ctrl + ↓', action: 'Volume down' },
    { key: 'Ctrl + L', action: 'Toggle lyrics' },
    { key: 'Ctrl + F', action: 'Search' },
    { key: 'Media Keys', action: 'Play/Pause, Next, Previous' }
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 32 }}>Settings</h1>

        {/* Music Folders */}
        <Section icon={<FolderOpen size={18} />} title="Music Folders">
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Manage the folders hoplayer scans for music and video files.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {scanPaths.map(path => (
              <div
                key={path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <FolderOpen size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {path}
                </span>
                <button
                  onClick={() => handleRescan(path)}
                  disabled={scanning === path}
                  title="Rescan"
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <RefreshCw size={14} style={scanning === path ? { animation: 'spin 1s linear infinite' } : undefined} />
                </button>
                <button
                  onClick={() => removeDirectory(path)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {scanPaths.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                No folders added yet
              </div>
            )}
          </div>

          <button
            onClick={addDirectory}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            Add Folder
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            {tracks.length} tracks in library
          </div>
        </Section>

        {/* Audio */}
        <Section icon={<Volume2 size={18} />} title="Audio">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', width: 60 }}>Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={e => setVolume(Number(e.target.value) / 100)}
              style={{ flex: 1, accentColor: 'var(--color-primary, #6366f1)' }}
            />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', width: 40, textAlign: 'right' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </Section>

        {/* Keyboard Shortcuts */}
        <Section icon={<Keyboard size={18} />} title="Keyboard Shortcuts">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {shortcuts.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{s.action}</span>
                <kbd style={{
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'monospace'
                }}>
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </Section>

        {/* About */}
        <Section icon={<Info size={18} />} title="About">
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
            <p><strong style={{ color: 'rgba(255,255,255,0.8)' }}>hoplayer</strong> v0.1.0</p>
            <p>Modern music/video player with clean UI and creative interactions.</p>
            <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Built with Electron + React + TypeScript + Tailwind CSS
            </p>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ color: 'var(--color-primary, #6366f1)' }}>{icon}</span>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{title}</h2>
      </div>
      <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
        {children}
      </div>
    </div>
  )
}
