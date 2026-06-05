import { Minus, Square, X, Music } from 'lucide-react'

export default function TitleBar() {
  return (
    <div
      className="titlebar-drag"
      style={{
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15,15,20,0.8)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16 }}>
        <Music style={{ width: 16, height: 16, color: 'var(--color-primary, #6366f1)' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          hoplayer
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {[
          { icon: <Minus size={14} />, action: () => window.electronAPI.minimizeWindow() },
          { icon: <Square size={12} />, action: () => window.electronAPI.maximizeWindow() },
          { icon: <X size={14} />, action: () => window.electronAPI.closeWindow(), hoverBg: 'rgba(239,68,68,0.8)' }
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
              color: 'rgba(255,255,255,0.5)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = btn.hoverBg || 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
