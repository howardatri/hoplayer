import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import usePlayerStore from '@/store/playerStore'
import { setEqBands } from '@/hooks/usePlayer'

const BAND_LABELS = ['60', '230', '910', '3.6K', '14K']

const PRESETS: Record<string, number[]> = {
  flat:         [0, 0, 0, 0, 0],
  rock:         [5, 3, -1, 2, 4],
  pop:          [-1, 3, 5, 3, -1],
  jazz:         [3, 1, -1, 1, 3],
  classical:    [4, 2, -1, 2, 4],
  bass_boost:   [6, 4, 0, 0, 0],
  treble_boost: [0, 0, 0, 4, 6],
  vocal:        [-2, -1, 3, 4, 1]
}

const PRESET_NAMES: Record<string, string> = {
  flat: 'Flat',
  rock: 'Rock',
  pop: 'Pop',
  jazz: 'Jazz',
  classical: 'Classical',
  bass_boost: 'Bass Boost',
  treble_boost: 'Treble Boost',
  vocal: 'Vocal'
}

interface EqualizerProps {
  isOpen: boolean
  onClose: () => void
}

export default function Equalizer({ isOpen, onClose }: EqualizerProps) {
  const eqBands = usePlayerStore(s => s.eqBands)
  const eqPreset = usePlayerStore(s => s.eqPreset)
  const storeSetEqBands = usePlayerStore(s => s.setEqBands)
  const storeSetEqPreset = usePlayerStore(s => s.setEqPreset)

  // Sync store bands to Web Audio filters on mount / when bands change
  useEffect(() => {
    setEqBands(eqBands)
  }, [eqBands])

  const handlePreset = (preset: string) => {
    const bands = PRESETS[preset]
    if (!bands) return
    storeSetEqBands(bands)
    storeSetEqPreset(preset)
  }

  const handleSliderChange = (index: number, value: number) => {
    const newBands = [...eqBands]
    newBands[index] = Math.round(value * 10) / 10
    storeSetEqBands(newBands)
    storeSetEqPreset('custom')
  }

  return (
    <>
      <style>{`
        .eq-slider::-webkit-slider-runnable-track {
          height: 4px;
          background: var(--color-border);
          border-radius: 2px;
        }
        .eq-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 6px var(--color-primary);
          margin-top: -5px;
          cursor: pointer;
        }
        .eq-slider::-moz-range-track {
          height: 4px;
          background: var(--color-border);
          border-radius: 2px;
          border: none;
        }
        .eq-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 6px var(--color-primary);
          border: none;
          cursor: pointer;
        }
      `}</style>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 80,
              width: 320,
              zIndex: 200,
              background: 'color-mix(in srgb, var(--color-bg) 98%, transparent)',
              backdropFilter: 'blur(20px)',
              borderLeft: '1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 16px 12px',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Equalizer</span>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-secondary)', padding: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Preset selector */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                Presets
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                {Object.keys(PRESETS).map(key => (
                  <button
                    key={key}
                    onClick={() => handlePreset(key)}
                    style={{
                      background: eqPreset === key ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'var(--color-surface)',
                      border: eqPreset === key ? '1px solid color-mix(in srgb, var(--color-primary) 50%, transparent)' : '1px solid var(--color-surface-hover)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11,
                      color: eqPreset === key ? 'var(--color-text)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {PRESET_NAMES[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* EQ Sliders */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '16px 24px',
              overflow: 'hidden'
            }}>
              {eqBands.map((gain, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  gap: 8,
                  flex: 1
                }}>
                  {/* dB value */}
                  <span style={{
                    fontSize: 10,
                    color: gain !== 0 ? 'var(--color-primary-light, #9b82f8)' : 'var(--color-text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                    minWidth: 28,
                    textAlign: 'center' as const
                  }}>
                    {gain > 0 ? `+${gain}` : gain}dB
                  </span>

                  {/* Vertical slider using rotated input */}
                  <div style={{
                    height: 160,
                    width: 28,
                    position: 'relative' as const,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <input
                      className="eq-slider"
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={-gain}
                      onChange={(e) => handleSliderChange(i, -parseFloat(e.target.value))}
                      style={{
                        width: 160,
                        height: 28,
                        appearance: 'none' as const,
                        WebkitAppearance: 'none' as unknown as undefined,
                        background: 'transparent',
                        cursor: 'pointer',
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center center',
                        position: 'absolute' as const
                      }}
                    />
                    {/* Center mark (0 dB) */}
                    <div style={{
                      position: 'absolute' as const,
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 6,
                      height: 1,
                      background: 'var(--color-text-muted)',
                      pointerEvents: 'none' as const
                    }} />
                  </div>

                  {/* Band label */}
                  <span style={{
                    fontSize: 10,
                    color: 'var(--color-text-muted)',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {BAND_LABELS[i]}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
