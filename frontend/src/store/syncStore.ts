import { create } from 'zustand'

interface SyncStore {
  isSyncing: boolean
  lastSyncedAt: string | null
  pendingCount: number
  error: string | null
  setIsSyncing: (v: boolean) => void
  setLastSyncedAt: (v: string | null) => void
  setPendingCount: (v: number) => void
  setError: (v: string | null) => void
}

export const useSyncStore = create<SyncStore>()((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  error: null,

  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setError: (error) => set({ error }),
}))
