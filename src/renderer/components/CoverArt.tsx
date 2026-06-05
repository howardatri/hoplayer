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
  lg: 'w-48 h-48',
  xl: 'w-64 h-64'
}

const iconSizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20'
}

export default function CoverArt({
  filePath,
  size = 'md',
  isPlaying = false,
  className = ''
}: CoverArtProps) {
  const { coverUrl } = useCoverArt(filePath)

  return (
    <div
      className={`${sizeMap[size]} rounded-lg overflow-hidden flex-shrink-0 relative bg-white/5 ${className}`}
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
            <Music className={`${iconSizeMap[size]} text-white/20`} />
          ) : (
            <Disc3 className={`${iconSizeMap[size]} text-white/10`} />
          )}
        </div>
      )}

      {/* Spinning overlay for playing state (large sizes only) */}
      {(size === 'lg' || size === 'xl') && isPlaying && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{
            margin: '8%',
            borderRadius: '50%',
            borderStyle: 'dashed'
          }}
        />
      )}
    </div>
  )
}
