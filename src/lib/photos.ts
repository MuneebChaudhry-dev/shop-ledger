import imageCompression from 'browser-image-compression'
import { useEffect, useState } from 'react'
import { db, newId } from './db'
import { supabase } from './supabase'
import { queueSync } from './sync'

export type PhotoKind = 'lot' | 'bill' | 'sale' | 'piece' | 'return'

/** Compress (about 150 KB, max 1280 px), store locally, queue upload. Returns the photo id. */
export const savePhoto = async (file: File, kind: PhotoKind): Promise<string> => {
  const blob = await imageCompression(file, { maxSizeMB: 0.15, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/jpeg' })
  const id = newId()
  await db.photos.put({ id, blob, kind, uploaded: 0, createdAt: Date.now() })
  queueSync()
  return id
}

const signedCache = new Map<string, string>()

/** Object URL for a local photo, or a signed URL for one that only exists in the cloud. */
export const usePhotoUrl = (photoId?: string): string | undefined => {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let objectUrl: string | undefined
    let cancelled = false
    void (async () => {
      if (!photoId) return setUrl(undefined)
      const local = await db.photos.get(photoId)
      if (local) {
        objectUrl = URL.createObjectURL(local.blob)
        if (!cancelled) setUrl(objectUrl)
        return
      }
      const cached = signedCache.get(photoId)
      if (cached) {
        if (!cancelled) setUrl(cached)
        return
      }
      if (!navigator.onLine) return
      // Item and sale photos sit at the root; bill photos under bills/.
      let { data } = await supabase.storage.from('photos').createSignedUrl(`${photoId}.jpg`, 60 * 60 * 24)
      if (!data?.signedUrl) ({ data } = await supabase.storage.from('photos').createSignedUrl(`bills/${photoId}.jpg`, 60 * 60 * 24))
      if (data?.signedUrl) {
        signedCache.set(photoId, data.signedUrl)
        if (!cancelled) setUrl(data.signedUrl)
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])
  return url
}
