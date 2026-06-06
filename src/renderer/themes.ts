export interface ThemeColors {
  primary: string
  primaryLight: string
  primaryDark: string
  accent: string
  accentLight: string
  bg: string
  gradient: string
  surface: string
  surfaceHover: string
  surfaceActive: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  scrollbar: string
  scrollbarHover: string
}

export interface Theme {
  id: string
  name: string
  colors: ThemeColors
}

export const themes: Theme[] = [
  // ─── Dark Themes ───────────────────────────────────────
  {
    id: 'aurora',
    name: 'Aurora',
    colors: {
      primary: '#7c5bf5',
      primaryLight: '#9b82f8',
      primaryDark: '#5b3dd4',
      accent: '#f570a5',
      accentLight: '#f89dc2',
      bg: '#0c0c18',
      gradient: 'linear-gradient(145deg, #0c0c18 0%, #10102a 50%, #0e0e20 100%)',
      surface: 'rgba(120, 100, 255, 0.06)',
      surfaceHover: 'rgba(120, 100, 255, 0.12)',
      surfaceActive: 'rgba(120, 100, 255, 0.18)',
      border: 'rgba(140, 120, 255, 0.1)',
      text: 'rgba(255, 255, 255, 0.92)',
      textSecondary: 'rgba(200, 190, 255, 0.55)',
      textMuted: 'rgba(180, 170, 230, 0.35)',
      scrollbar: 'rgba(140, 120, 255, 0.2)',
      scrollbarHover: 'rgba(140, 120, 255, 0.35)',
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      primary: '#3b82f6',
      primaryLight: '#60a5fa',
      primaryDark: '#2563eb',
      accent: '#818cf8',
      accentLight: '#a5b4fc',
      bg: '#000000',
      gradient: 'linear-gradient(145deg, #000000 0%, #0a0a0f 50%, #050508 100%)',
      surface: 'rgba(255, 255, 255, 0.04)',
      surfaceHover: 'rgba(255, 255, 255, 0.08)',
      surfaceActive: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(255, 255, 255, 0.06)',
      text: 'rgba(255, 255, 255, 0.9)',
      textSecondary: 'rgba(180, 200, 255, 0.5)',
      textMuted: 'rgba(160, 180, 220, 0.3)',
      scrollbar: 'rgba(255, 255, 255, 0.1)',
      scrollbarHover: 'rgba(255, 255, 255, 0.2)',
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#06b6d4',
      primaryLight: '#22d3ee',
      primaryDark: '#0891b2',
      accent: '#2dd4bf',
      accentLight: '#5eead4',
      bg: '#0a1628',
      gradient: 'linear-gradient(145deg, #0a1628 0%, #0c1f3a 50%, #081420 100%)',
      surface: 'rgba(6, 182, 212, 0.06)',
      surfaceHover: 'rgba(6, 182, 212, 0.12)',
      surfaceActive: 'rgba(6, 182, 212, 0.18)',
      border: 'rgba(6, 182, 212, 0.1)',
      text: 'rgba(255, 255, 255, 0.92)',
      textSecondary: 'rgba(180, 230, 255, 0.55)',
      textMuted: 'rgba(160, 210, 240, 0.35)',
      scrollbar: 'rgba(6, 182, 212, 0.2)',
      scrollbarHover: 'rgba(6, 182, 212, 0.35)',
    }
  },
  {
    id: 'ember',
    name: 'Ember',
    colors: {
      primary: '#f97316',
      primaryLight: '#fb923c',
      primaryDark: '#ea580c',
      accent: '#ef4444',
      accentLight: '#f87171',
      bg: '#140a08',
      gradient: 'linear-gradient(145deg, #140a08 0%, #1c100c 50%, #120a06 100%)',
      surface: 'rgba(249, 115, 22, 0.06)',
      surfaceHover: 'rgba(249, 115, 22, 0.12)',
      surfaceActive: 'rgba(249, 115, 22, 0.18)',
      border: 'rgba(249, 115, 22, 0.1)',
      text: 'rgba(255, 255, 255, 0.92)',
      textSecondary: 'rgba(255, 210, 180, 0.55)',
      textMuted: 'rgba(240, 180, 140, 0.35)',
      scrollbar: 'rgba(249, 115, 22, 0.2)',
      scrollbarHover: 'rgba(249, 115, 22, 0.35)',
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#22c55e',
      primaryLight: '#4ade80',
      primaryDark: '#16a34a',
      accent: '#a3e635',
      accentLight: '#bef264',
      bg: '#081210',
      gradient: 'linear-gradient(145deg, #081210 0%, #0c1a16 50%, #06100e 100%)',
      surface: 'rgba(34, 197, 94, 0.06)',
      surfaceHover: 'rgba(34, 197, 94, 0.12)',
      surfaceActive: 'rgba(34, 197, 94, 0.18)',
      border: 'rgba(34, 197, 94, 0.1)',
      text: 'rgba(255, 255, 255, 0.92)',
      textSecondary: 'rgba(180, 255, 200, 0.55)',
      textMuted: 'rgba(160, 230, 180, 0.35)',
      scrollbar: 'rgba(34, 197, 94, 0.2)',
      scrollbarHover: 'rgba(34, 197, 94, 0.35)',
    }
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      primary: '#ec4899',
      primaryLight: '#f472b6',
      primaryDark: '#db2777',
      accent: '#a855f7',
      accentLight: '#c084fc',
      bg: '#130812',
      gradient: 'linear-gradient(145deg, #130812 0%, #1a0e1a 50%, #100810 100%)',
      surface: 'rgba(236, 72, 153, 0.06)',
      surfaceHover: 'rgba(236, 72, 153, 0.12)',
      surfaceActive: 'rgba(236, 72, 153, 0.18)',
      border: 'rgba(236, 72, 153, 0.1)',
      text: 'rgba(255, 255, 255, 0.92)',
      textSecondary: 'rgba(255, 200, 230, 0.55)',
      textMuted: 'rgba(230, 170, 210, 0.35)',
      scrollbar: 'rgba(236, 72, 153, 0.2)',
      scrollbarHover: 'rgba(236, 72, 153, 0.35)',
    }
  },
  // ─── Light Themes ──────────────────────────────────────
  {
    id: 'sunrise',
    name: 'Sunrise',
    colors: {
      primary: '#e85d26',
      primaryLight: '#f0763e',
      primaryDark: '#c94d1e',
      accent: '#eab308',
      accentLight: '#facc15',
      bg: '#faf8f5',
      gradient: 'linear-gradient(145deg, #faf8f5 0%, #f5f0ea 50%, #faf6f0 100%)',
      surface: 'rgba(232, 93, 38, 0.06)',
      surfaceHover: 'rgba(232, 93, 38, 0.1)',
      surfaceActive: 'rgba(232, 93, 38, 0.16)',
      border: 'rgba(0, 0, 0, 0.08)',
      text: 'rgba(20, 20, 30, 0.88)',
      textSecondary: 'rgba(80, 60, 40, 0.55)',
      textMuted: 'rgba(100, 80, 60, 0.35)',
      scrollbar: 'rgba(0, 0, 0, 0.12)',
      scrollbarHover: 'rgba(0, 0, 0, 0.22)',
    }
  },
  {
    id: 'arctic',
    name: 'Arctic',
    colors: {
      primary: '#0ea5e9',
      primaryLight: '#38bdf8',
      primaryDark: '#0284c7',
      accent: '#06b6d4',
      accentLight: '#22d3ee',
      bg: '#f0f7fb',
      gradient: 'linear-gradient(145deg, #f0f7fb 0%, #e8f2f8 50%, #f0f6fa 100%)',
      surface: 'rgba(14, 165, 233, 0.06)',
      surfaceHover: 'rgba(14, 165, 233, 0.1)',
      surfaceActive: 'rgba(14, 165, 233, 0.16)',
      border: 'rgba(0, 0, 0, 0.07)',
      text: 'rgba(15, 25, 40, 0.88)',
      textSecondary: 'rgba(30, 60, 90, 0.55)',
      textMuted: 'rgba(50, 80, 110, 0.35)',
      scrollbar: 'rgba(0, 0, 0, 0.1)',
      scrollbarHover: 'rgba(0, 0, 0, 0.2)',
    }
  },
  {
    id: 'sakura',
    name: 'Sakura',
    colors: {
      primary: '#e11d82',
      primaryLight: '#f0369b',
      primaryDark: '#be185d',
      accent: '#a855f7',
      accentLight: '#c084fc',
      bg: '#fdf2f8',
      gradient: 'linear-gradient(145deg, #fdf2f8 0%, #fae8f4 50%, #fdf0f6 100%)',
      surface: 'rgba(225, 29, 130, 0.06)',
      surfaceHover: 'rgba(225, 29, 130, 0.1)',
      surfaceActive: 'rgba(225, 29, 130, 0.16)',
      border: 'rgba(0, 0, 0, 0.07)',
      text: 'rgba(25, 15, 25, 0.88)',
      textSecondary: 'rgba(100, 40, 70, 0.55)',
      textMuted: 'rgba(120, 60, 90, 0.35)',
      scrollbar: 'rgba(0, 0, 0, 0.1)',
      scrollbarHover: 'rgba(0, 0, 0, 0.2)',
    }
  },
  {
    id: 'mint',
    name: 'Mint',
    colors: {
      primary: '#059669',
      primaryLight: '#10b981',
      primaryDark: '#047857',
      accent: '#06b6d4',
      accentLight: '#22d3ee',
      bg: '#f0fdf8',
      gradient: 'linear-gradient(145deg, #f0fdf8 0%, #e8faf2 50%, #f0fcf6 100%)',
      surface: 'rgba(5, 150, 105, 0.06)',
      surfaceHover: 'rgba(5, 150, 105, 0.1)',
      surfaceActive: 'rgba(5, 150, 105, 0.16)',
      border: 'rgba(0, 0, 0, 0.07)',
      text: 'rgba(15, 25, 20, 0.88)',
      textSecondary: 'rgba(30, 80, 60, 0.55)',
      textMuted: 'rgba(50, 100, 80, 0.35)',
      scrollbar: 'rgba(0, 0, 0, 0.1)',
      scrollbarHover: 'rgba(0, 0, 0, 0.2)',
    }
  },
]

export function getThemeById(id: string): Theme {
  return themes.find(t => t.id === id) || themes[0]
}

/** Apply theme colors to :root CSS variables */
export function applyTheme(theme: Theme) {
  const c = theme.colors
  const root = document.documentElement.style
  root.setProperty('--color-primary', c.primary)
  root.setProperty('--color-primary-light', c.primaryLight)
  root.setProperty('--color-primary-dark', c.primaryDark)
  root.setProperty('--color-accent', c.accent)
  root.setProperty('--color-accent-light', c.accentLight)
  root.setProperty('--color-bg', c.bg)
  root.setProperty('--color-surface', c.surface)
  root.setProperty('--color-surface-hover', c.surfaceHover)
  root.setProperty('--color-surface-active', c.surfaceActive)
  root.setProperty('--color-border', c.border)
  root.setProperty('--color-text', c.text)
  root.setProperty('--color-text-secondary', c.textSecondary)
  root.setProperty('--color-text-muted', c.textMuted)

  // Update scrollbar + global theme styles
  const styleEl = document.getElementById('theme-scrollbar-style') || document.createElement('style')
  styleEl.id = 'theme-scrollbar-style'
  styleEl.textContent = `
    ::-webkit-scrollbar-thumb { background: ${c.scrollbar}; }
    ::-webkit-scrollbar-thumb:hover { background: ${c.scrollbarHover}; }
    input[type='range']::-webkit-slider-track { background: ${c.border}; }
    input[type='range']::-webkit-slider-thumb { background: ${c.primary}; box-shadow: 0 0 8px ${c.primary}66; }
    .glass { background: ${c.surface}; border-color: ${c.border}; }
    .glass-strong { background: ${c.surfaceHover}; border-color: ${c.border}; }
    .glow { box-shadow: 0 0 20px ${c.primary}4d, 0 0 60px ${c.primary}1a; }
  `
  if (!document.getElementById('theme-scrollbar-style')) document.head.appendChild(styleEl)

  // Update body background
  document.body.style.background = c.gradient
  document.body.style.backgroundColor = c.bg
}
