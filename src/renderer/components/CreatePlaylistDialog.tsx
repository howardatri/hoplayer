import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ListMusic } from 'lucide-react'

interface CreatePlaylistDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

export default function CreatePlaylistDialog({
  isOpen,
  onClose,
  onCreate
}: CreatePlaylistDialogProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setName('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-80 glass-strong rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">New Playlist</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Playlist name..."
                autoFocus
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!name.trim()}
                  className="px-6 py-2 bg-primary rounded-lg text-sm text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  Create
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
