import { useLiveQuery } from 'dexie-react-hooks'
import { FolderPlus, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Input, PageHeader, Spinner } from '../components/ui'
import { db, newId, patchRecord, saveRecord, softDelete, type Tag, type TagGroup } from '../lib/db'
import { queueSync } from '../lib/sync'

const GroupCard = ({ group, tags }: { group: TagGroup; tags: Tag[] }) => {
  const [name, setName] = useState('')
  const [rename, setRename] = useState(group.name)
  return (
    <Card className="space-y-3">
      <div className="flex gap-2">
        <Input value={rename} onChange={(e) => setRename(e.target.value)} className="font-semibold" />
        {rename.trim() && rename !== group.name && (
          <Button size="md" onClick={() => { void patchRecord<TagGroup>('tagGroups', group.id, { name: rename.trim() }); queueSync() }}>Save</Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t.id} dir="auto" className="flex h-9 items-center gap-1 rounded-full bg-slate-100 pl-3 pr-1 text-sm">
            {t.name}
            <button type="button" aria-label={`Remove ${t.name}`} className="rounded-full p-1 active:bg-slate-200" onClick={() => { if (confirm(`Remove tag "${t.name}"? Old items keep it in history.`)) { void softDelete('tags', t.id); queueSync() } }}>
              <X className="size-4" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await saveRecord<Tag>('tags', { id: newId(), groupId: group.id, name: name.trim() })
          setName('')
          queueSync()
        }}
      >
        <Input placeholder="New tag (English or Urdu)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button disabled={!name.trim()} aria-label="Add tag"><Plus className="size-5" /></Button>
      </form>
    </Card>
  )
}

export const TagsPage = () => {
  const groups = useLiveQuery(async () => (await db.tagGroups.toArray()).filter((g) => !g.deletedAt).sort((a, b) => a.sort - b.sort), [])
  const tags = useLiveQuery(async () => (await db.tags.toArray()).filter((t) => !t.deletedAt), [])
  const [group, setGroup] = useState('')
  if (!groups || !tags) return <Spinner />
  return (
    <div className="space-y-3">
      <PageHeader title="Tags" back />
      {groups.map((g) => <GroupCard key={g.id} group={g} tags={tags.filter((t) => t.groupId === g.id)} />)}
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!group.trim()) return
          await saveRecord<TagGroup>('tagGroups', { id: newId(), name: group.trim(), sort: groups.length + 1 })
          setGroup('')
          queueSync()
        }}
      >
        <Input placeholder="New group, e.g. Season" value={group} onChange={(e) => setGroup(e.target.value)} />
        <Button disabled={!group.trim()}><FolderPlus className="size-5" />Add group</Button>
      </form>
    </div>
  )
}
