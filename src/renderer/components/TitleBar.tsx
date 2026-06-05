import { Minus, Square, X, Music } from 'lucide-react'
import { motion } from 'framer-motion'

export default function TitleBar() {
  return (
    <div className="titlebar-drag h-10 flex items-center justify-between bg-[#0f0f14]/80 backdrop-blur-sm border-b border-white/5 select-none">
      {/* App icon / title */}
      <div className="flex items-center gap-2 pl-4">
        <Music className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-white/60 tracking-wider uppercase">
          hoplayer
        </span>
      </div>

      {/* Window controls */}
      <div className="flex items-center">
        <motion.button
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-11 h-10 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-11 h-10 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
        </motion.button>
        <motion.button
          whileHover={{ backgroundColor: 'rgba(239,68,68,0.8)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.electronAPI.closeWindow()}
          className="w-11 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors hover:bg-red-500/80"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  )
}
