import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type?: 'info' | 'success' | 'error'
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type'], duration?: number) => void
  removeToast: (id: string) => void
}

let toastId = 0
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 2500) => {
    const id = `toast-${++toastId}`
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }))
    const timer = setTimeout(() => {
      pendingTimers.delete(id)
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)
    pendingTimers.set(id, timer)
  },

  removeToast: (id) => {
    // Clear pending auto-dismiss timer to prevent leaks
    const timer = pendingTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      pendingTimers.delete(id)
    }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  }
}))

export default useToastStore
