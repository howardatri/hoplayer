import { motion } from 'framer-motion'
import { Disc3, Music } from 'lucide-react'
import { useCoverArt } from '@/hooks/useCoverArt'

interface CoverArtProps {
  filePath?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isPlaying?: boolean
  className?: string
}

const sizeMap = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'aspect-square',
  xl: 'aspect-square'
}

const iconSizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
}

/**
 * Album cover art component with vinyl rotation animation.
 * Large sizes show a vinyl-disc style rotation when playing.
 */
export default function CoverArt({
  filePath,
  size = 'md',
  isPlaying = false,
  className = ''
}: CoverArtProps) {
  const { coverUrl } = useCoverArt(filePath)
  const isLarge = size === 'lg' || size === 'xl'

  return (
    <div
      className={`${sizeMap[size]} flex-shrink-0 relative ${className}`}
    >
      {/* Vinyl disc background (large sizes only) */}
      {isLarge && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={
            isPlaying
              ? { duration: 4, repeat: Infinity, ease: 'linear' }
              : { duration: 0.5, ease: 'easeOut' }
          }
        >
          {/* Vinyl body — always dark regardless of theme */}
          <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)' }}>
            {[0.2, 0.35, 0.5, 0.65, 0.8].map((ratio) => (
              <div
                key={ratio}
                className="absolute rounded-full"
                style={{
                  inset: `${(1 - ratio) * 50}%`,
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              />
            ))}
          </div>
          {/* Center label area */}
          <div
            className="absolute rounded-full"
            style={{ width: '30%', height: '30%', background: 'linear-gradient(135deg, #2a2a3e, #1a1a2e)' }}
          />
          {/* Center hole */}
          <div
            className="absolute rounded-full"
            style={{ width: '8%', height: '8%', background: '#0a0a12' }}
          />
        </motion.div>
      )}

      {/* Cover image */}
      <motion.div
        className={`${isLarge ? 'absolute' : ''} inset-0 rounded-lg overflow-hidden bg-surface ${
          isLarge ? 'rounded-full' : ''
        }`}
        style={isLarge ? { margin: '12%' } : undefined}
        animate={
          isLarge
            ? { rotate: isPlaying ? 360 : 0 }
            : undefined
        }
        transition={
          isLarge
            ? isPlaying
              ? { duration: 8, repeat: Infinity, ease: 'linear' }
              : { duration: 0.5, ease: 'easeOut' }
            : undefined
        }
      >
        {coverUrl ? (
          <motion.img
            src={coverUrl}
            alt="Album cover"
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {size === 'sm' || size === 'md' ? (
              <Music className={`${iconSizeMap[size]} text-fg-muted`} />
            ) : (
              <Disc3 className={`${iconSizeMap[size]} text-fg-muted`} />
            )}
          </div>
        )}
      </motion.div>

      {/* Vinyl edge highlight (large sizes only) */}
      {isLarge && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3), 0 0 20px rgba(0,0,0,0.2)'
          }}
        />
      )}
    </div>
  )
}
