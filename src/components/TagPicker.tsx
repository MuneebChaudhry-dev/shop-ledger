import { useLiveQuery } from 'dexie-react-hooks'
import { cn } from '../lib/cn'
import { db } from '../lib/db'

export const useTagNames = () => {
  const tags = useLiveQuery(() => db.tags.toArray(), [])
  return new Map((tags ?? []).filter((t) => !t.deletedAt).map((t) => [t.id, t.name]))
}

export const TagPicker = ({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) => {
  const groups = useLiveQuery(() => db.tagGroups.toArray(), [])
  const tags = useLiveQuery(() => db.tags.toArray(), [])
  const live = (groups ?? []).filter((g) => !g.deletedAt).sort((a, b) => a.sort - b.sort)
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  if (!live.length) return <p className="text-sm text-slate-500">No tags yet. They appear after the first sync, or add them in Settings.</p>
  return (
    <div className="space-y-3">
      {live.map((g) => (
        <div key={g.id}>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500" dir="auto">{g.name}</p>
          <div className="flex flex-wrap gap-2">
            {(tags ?? [])
              .filter((t) => t.groupId === g.id && !t.deletedAt)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  dir="auto"
                  onClick={() => toggle(t.id)}
                  className={cn(
                    'h-9 rounded-full border px-3 text-sm',
                    value.includes(t.id) ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700',
                  )}
                >
                  {t.name}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export const TagChips = ({ ids, names }: { ids: string[]; names: Map<string, string> }) => (
  <div className="flex flex-wrap gap-1">
    {ids
      .map((id) => [id, names.get(id)] as const)
      .filter(([, n]) => n)
      .map(([id, n]) => (
        <span key={id} dir="auto" className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{n}</span>
      ))}
  </div>
)
