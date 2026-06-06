import { Minus, Square, X, Music, PictureInPicture2 } from 'lucide-react'

export default function TitleBar() {
  return (
    <div
      className="titlebar-drag"
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'color-mix(in srgb, var(--color-bg) 60%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16 }}>
        <Music style={{ width: 16, height: 16, color: 'var(--color-primary)' }} />
        <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          hoplayer
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => window.electronAPI.toggleMiniPlayer()}
          title="Mini Player"
          style={{
            width: 44, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
        >
          <PictureInPicture2 size={14} />
        </button>
        {[
          { icon: <Minus size={14} />, action: () => window.electronAPI.minimizeWindow() },
          { icon: <Square size={12} />, action: () => window.electronAPI.maximizeWindow() },
          { icon: <X size={14} />, action: () => window.electronAPI.closeWindow(), hoverBg: 'color-mix(in srgb, var(--color-danger) 80%, transparent)' }
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            style={{
              width: 44,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = btn.hoverBg || 'var(--color-surface-hover)'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-muted)'
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
