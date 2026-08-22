const DB_NAME = 'DayflowOfflinePWA'
const DB_VERSION = 1

export interface QueuedUpload {
  id: string
  doc_type: string
  title: string
  file_name: string
  file_blob: Blob
  file_size: number | string
  uploaded_at: string
  status: 'QUEUED' | 'UPLOADING' | 'FAILED'
}


export interface CachedDocument {
  id: string
  file_name: string
  file_blob: Blob
  mime_type: string
  cached_at: string
}

export interface PendingAction {
  id: string
  action_type: 'CHECK_IN' | 'CHECK_OUT' | 'LEAVE_REQUEST'
  payload: any
  created_at: string
  status: 'PENDING_SYNC'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('queued_uploads')) {
        db.createObjectStore('queued_uploads', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('cached_documents')) {
        db.createObjectStore('cached_documents', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Queue pending user action (Check-In, Check-Out, Leave Request)
export async function queuePendingAction(action_type: PendingAction['action_type'], payload: any): Promise<PendingAction> {
  const db = await openDB()
  const item: PendingAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    action_type,
    payload,
    created_at: new Date().toISOString(),
    status: 'PENDING_SYNC',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readwrite')
    const store = tx.objectStore('pending_actions')
    const req = store.put(item)

    req.onsuccess = () => resolve(item)
    req.onerror = () => reject(req.error)
  })
}

// Get all pending actions from IndexedDB
export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readonly')
    const store = tx.objectStore('pending_actions')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

// Remove pending action from IndexedDB
export async function removePendingAction(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_actions', 'readwrite')
    const store = tx.objectStore('pending_actions')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}


// Queue document upload for offline processing
export async function queueOfflineUpload(doc: Omit<QueuedUpload, 'id' | 'uploaded_at' | 'status'>): Promise<QueuedUpload> {
  const db = await openDB()
  const queuedItem: QueuedUpload = {
    ...doc,
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    uploaded_at: new Date().toISOString(),
    status: 'QUEUED',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('queued_uploads', 'readwrite')
    const store = tx.objectStore('queued_uploads')
    const req = store.put(queuedItem)

    req.onsuccess = () => resolve(queuedItem)
    req.onerror = () => reject(req.error)
  })
}

// Get all queued uploads from IndexedDB
export async function getQueuedUploads(): Promise<QueuedUpload[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queued_uploads', 'readonly')
    const store = tx.objectStore('queued_uploads')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

// Remove queued upload from IndexedDB
export async function removeQueuedUpload(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queued_uploads', 'readwrite')
    const store = tx.objectStore('queued_uploads')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Cache document blob for offline viewing
export async function cacheDocumentBlob(id: string, file_name: string, blob: Blob, mime_type: string): Promise<void> {
  const db = await openDB()
  const cachedItem: CachedDocument = {
    id: String(id),
    file_name,
    file_blob: blob,
    mime_type,
    cached_at: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_documents', 'readwrite')
    const store = tx.objectStore('cached_documents')
    const req = store.put(cachedItem)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Get cached document blob for offline viewing
export async function getCachedDocumentBlob(id: string): Promise<CachedDocument | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_documents', 'readonly')
    const store = tx.objectStore('cached_documents')
    const req = store.get(String(id))

    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

// Sync all queued uploads to server
export async function syncQueuedUploads(
  uploadFn: (item: QueuedUpload) => Promise<any>
): Promise<{ synced: number; failed: number }> {
  const queued = await getQueuedUploads()
  if (!queued.length) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const item of queued) {
    try {
      await uploadFn(item)
      await removeQueuedUpload(item.id)
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
