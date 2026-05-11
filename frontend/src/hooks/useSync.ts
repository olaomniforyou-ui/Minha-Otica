import { useCallback } from 'react'
import { useSyncStore } from '@/store/syncStore'
import { runSync, refreshPendingCount } from '@/services/sync.service'

export function useSync() {
  const { isSyncing, lastSyncedAt, pendingCount, error } = useSyncStore()

  const sync = useCallback(async () => {
    await runSync('manual')
    await refreshPendingCount()
  }, [])

  return { isSyncing, lastSyncedAt, pendingCount, error, sync }
}
