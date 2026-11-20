import { Camera, ImageOff } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { savePhoto, usePhotoUrl, type PhotoKind } from '../lib/photos'
import { ErrorAlert } from './Alert'

export const PhotoThumb = ({ photoId, className }: { photoId?: string; className?: string }) => {
  const url = usePhotoUrl(photoId)
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100', className ?? 'size-14')}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImageOff className="size-5 text-slate-400" />}
    </div>
  )
}

/** Opens the camera; saves a compressed photo and returns its id. */
export const PhotoInput = ({
  value,
  onChange,
  kind,
  label = 'Take photo',
}: {
  value?: string
  onChange: (id: string) => void
  kind: PhotoKind
  label?: string
}) => {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3 text-left active:bg-slate-50"
      >
        {value ? (
          <PhotoThumb photoId={value} className="size-20" />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-xl bg-slate-100"><Camera className="size-7 text-slate-500" /></div>
        )}
        <span className="font-medium text-slate-700">{busy ? 'Saving...' : value ? 'Retake photo' : label}</span>
      </button>
      {error && <div className="mt-2"><ErrorAlert error={error} onClose={() => setError(undefined)} /></div>}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          setError(undefined)
          try {
            onChange(await savePhoto(file, kind))
          } catch {
            setError('Could not read that photo. Try again.')
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
