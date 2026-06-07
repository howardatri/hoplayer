import { useState, useMemo, useEffect, useCallback } from 'react'
import { FolderOpen, Trash2, Plus, Volume2, Keyboard, Info, RefreshCw, Palette, Minimize2, Bell, Headphones } from 'lucide-react'
import { useLibrary } from '@/hooks/useLibrary'
import { getAudioOutputDevices, setAudioOutputDevice } from '@/hooks/usePlayer'
import usePlayerStore from '@/store/playerStore'
import useSettingsStore from '@/store/settingsStore'
import { groupTracksByFolder } from '@/utils/paths'
import { themes } from '@/themes'

export default function SettingsPage() {
  const { tracks, scanPaths, addDirectory, removeDirectory, isLoading, scanDirectory } = useLibrary()
  const volume = usePlayerStore(s => s.volume)
  const setVolume = usePlayerStore(s => s.setVolume)
  const crossfadeDuration = usePlayerStore(s => s.crossfadeDuration)
  const setCrossfadeDuration = usePlayerStore(s => s.setCrossfadeDuration)
  const themeId = useSettingsStore(s => s.themeId)
  const setThemeId = useSettingsStore(s => s.setThemeId)
  const minimizeToTray = useSettingsStore(s => s.minimizeToTray)
  const setMinimizeToTray = useSettingsStore(s => s.setMinimizeToTray)
  const enableNotifications = useSettingsStore(s => s.enableNotifications)
  const setEnableNotifications = useSettingsStore(s => s.setEnableNotifications)
  const audioOutputDeviceId = useSettingsStore(s => s.audioOutputDeviceId)
  const setAudioOutputDeviceId = useSettingsStore(s => s.setAudioOutputDeviceId)
  const [scanning, setScanning] = useState<string | null>(null)
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])

  // Enumerate audio output devices
  const refreshDevices = useCallback(async () => {
    const devices = await getAudioOutputDevices()
    setAudioDevices(devices)
  }, [])

  useEffect(() => { refreshDevices() }, [refreshDevices])

  const handleOutputDeviceChange = useCallback(async (deviceId: string) => {
    setAudioOutputDeviceId(deviceId)
    await setAudioOutputDevice(deviceId)
  }, [setAudioOutputDeviceId])

  const folderTrackCounts = useMemo(() => {
    const counts = new Map<string, number>()
    const grouped = groupTracksByFolder(tracks, scanPaths)
    for (const [folder, folderTracks] of grouped) {
      if (folder !== '__unknown__') counts.set(folder, folderTracks.length)
    }
    return counts
  }, [tracks, scanPaths])

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
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', marginBottom: 32 }}>Settings</h1>

        {/* Appearance */}
        <Section icon={<Palette size={18} />} title="Appearance">
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Choose a color theme for the interface. Dynamic album colors still apply on top.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {themes.map(theme => {
              const isActive = themeId === theme.id
              const c = theme.colors
              return (
                <button
                  key={theme.id}
                  onClick={() => setThemeId(theme.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
                    background: isActive ? c.surfaceHover : c.surface,
                    border: isActive ? `2px solid ${c.primary}` : `1px solid ${c.border}`,
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  {/* Color preview dots */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.primary, boxShadow: `0 0 8px ${c.primary}66` }} />
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.accent }} />
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.bg, border: `1px solid ${c.border}` }} />
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? c.primary : 'var(--color-text-secondary)',
                  }}>
                    {theme.name}
                  </span>
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 6, right: 8,
                      width: 6, height: 6, borderRadius: '50%',
                      background: c.primary,
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Behavior */}
        <Section icon={<Minimize2 size={18} />} title="Behavior">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>最小化到托盘</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Close button hides to system tray instead of quitting</div>
              </div>
              <ToggleSwitch value={minimizeToTray} onChange={(v) => { setMinimizeToTray(v); window.electronAPI.setMinimizeToTray(v) }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>切歌通知</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Show notification when track changes (window not focused)</div>
              </div>
              <ToggleSwitch value={enableNotifications} onChange={setEnableNotifications} />
            </div>
          </div>
        </Section>

        {/* Output Device */}
        <Section icon={<Headphones size={18} />} title="Output Device">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={audioOutputDeviceId}
              onChange={e => handleOutputDeviceChange(e.target.value)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: 'var(--color-bg)', color: 'var(--color-text)',
                border: '1px solid var(--color-border)', cursor: 'pointer',
              }}
            >
              <option value="">Default</option>
              {audioDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <button
              onClick={refreshDevices}
              title="Refresh devices"
              style={{
                background: 'none', border: '1px solid var(--color-border)', borderRadius: 8,
                padding: '8px 10px', cursor: 'pointer', color: 'var(--color-text-muted)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
            Select audio output device (speakers, headphones, USB DAC, etc.)
          </p>
        </Section>

        {/* Music Folders */}
        <Section icon={<FolderOpen size={18} />} title="Music Folders">
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Manage the folders hoplayer scans for music and video files.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {scanPaths.map(path => (
              <div
                key={path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                }}
              >
                <FolderOpen size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {path}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {folderTrackCounts.get(path) || 0} tracks
                </span>
                <button
                  onClick={() => handleRescan(path)}
                  disabled={scanning === path}
                  title="Rescan"
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <RefreshCw size={14} style={scanning === path ? { animation: 'spin 1s linear infinite' } : undefined} />
                </button>
                <button
                  onClick={() => removeDirectory(path)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {scanPaths.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No folders added yet
              </div>
            )}
          </div>

          <button
            onClick={addDirectory}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 8, fontSize: 13,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Add Folder
          </button>

          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
            {tracks.length} tracks in library
          </div>
        </Section>

        {/* Audio */}
        <Section icon={<Volume2 size={18} />} title="Audio">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', width: 60 }}>Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={e => setVolume(Number(e.target.value) / 100)}
                style={{ flex: 1, accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', width: 40, textAlign: 'right' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', width: 60, flexShrink: 0 }}>Crossfade</span>
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={crossfadeDuration}
                onChange={e => setCrossfadeDuration(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', width: 50, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {crossfadeDuration === 0 ? 'Off' : `${crossfadeDuration}s`}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: -8 }}>
              Smoothly blends consecutive tracks. Set to 0 to disable.
            </p>
          </div>
        </Section>

        {/* Keyboard Shortcuts */}
        <Section icon={<Keyboard size={18} />} title="Keyboard Shortcuts">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {shortcuts.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.action}</span>
                <kbd style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}>
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </Section>

        {/* About */}
        <Section icon={<Info size={18} />} title="About">
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            <p><strong style={{ color: 'var(--color-text)' }}>hoplayer</strong> v0.1.0</p>
            <p>Modern music/video player with clean UI and creative interactions.</p>
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
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
        <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{title}</h2>
      </div>
      <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {children}
      </div>
    </div>
  )
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? 'var(--color-primary)' : 'var(--color-border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: value ? 23 : 3,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}
