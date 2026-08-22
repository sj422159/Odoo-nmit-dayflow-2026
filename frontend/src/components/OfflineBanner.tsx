import { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import Swal from 'sweetalert2'
import {
  getPendingActions,
  getQueuedUploads,
  removePendingAction,
  syncQueuedUploads,
} from '@/lib/offlineQueue'
import { api } from '@/api/client'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)

  const checkQueue = async () => {
    try {
      const q = await getQueuedUploads()
      const actions = await getPendingActions()
      setQueuedCount(q.length + actions.length)
    } catch {
      // Ignore
    }
  }

  const triggerSync = async () => {
    if (!navigator.onLine || syncing) return
    setSyncing(true)

    try {
      // 1. Sync pending check-in/out and leave actions
      const actions = await getPendingActions()
      let syncedActions = 0
      for (const act of actions) {
        try {
          if (act.action_type === 'CHECK_IN') {
            await api.post('/attendance/check-in', act.payload)
          } else if (act.action_type === 'CHECK_OUT') {
            await api.post('/attendance/check-out', act.payload)
          } else if (act.action_type === 'LEAVE_REQUEST') {
            await api.post('/leave/requests', act.payload)
          }
          await removePendingAction(act.id)
          syncedActions++
        } catch {
          // Keep for next retry
        }
      }

      // 2. Sync queued document uploads
      const res = await syncQueuedUploads(async (item) => {
        const formData = new FormData()
        formData.append('document_type', item.doc_type)
        formData.append('title', item.title)
        formData.append('file', item.file_blob, item.file_name)
        await api.post('/employees/me/documents', formData)
      })

      setSyncing(false)
      checkQueue()

      const totalSynced = syncedActions + res.synced
      if (totalSynced > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Offline Actions Synced!',
          text: `Successfully processed ${totalSynced} pending action(s) & upload(s) queued while offline.`,
          timer: 3000,
          showConfirmButton: false,
        })
        window.dispatchEvent(new CustomEvent('dayflow:documents-updated'))
        window.dispatchEvent(new CustomEvent('dayflow:actions-synced'))
      }
    } catch {
      setSyncing(false)
    }
  }


  useEffect(() => {
    checkQueue()

    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => {
      setIsOffline(false)
      triggerSync()
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener('dayflow:queue-updated', checkQueue)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('dayflow:queue-updated', checkQueue)
    }
  }, [])

  if (!isOffline && queuedCount === 0) return null

  return (
    <div
      className={`w-full px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs ${
        isOffline
          ? 'bg-amber-500 text-amber-950 border-b border-amber-600'
          : 'bg-emerald-600 text-white border-b border-emerald-700'
      }`}
    >
      <div className="flex items-center gap-2">
        {isOffline ? (
          <WifiOff className="h-4 w-4 text-amber-950 shrink-0" />
        ) : (
          <Wifi className="h-4 w-4 text-white shrink-0 animate-pulse" />
        )}
        <span>
          {isOffline
            ? 'Offline Mode — Internet connection lost. Document uploads will be queued locally.'
            : 'Online — Connection restored. Syncing offline data...'}
        </span>
        {queuedCount > 0 && (
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
            {queuedCount} doc(s) queued
          </span>
        )}
      </div>

      {!isOffline && queuedCount > 0 && (
        <button
          type="button"
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-[11px] font-bold hover:bg-white/30 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      )}
    </div>
  )
}
