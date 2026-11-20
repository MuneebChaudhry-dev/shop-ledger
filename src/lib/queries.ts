import { useLiveQuery } from 'dexie-react-hooks'
import type { SellableItem } from './actions'
import { db } from './db'
import type { Role } from './roles'

/** Everything the current user may sell, newest first. Workers read the server's safe view. */
export const useSellableItems = (role: Role | undefined): SellableItem[] | undefined =>
  useLiveQuery(async () => {
    if (!role) return []
    if (role === 'worker') return (await db.workerItems.toArray()).filter((i) => i.qtyRemaining > 0)
    const lots = (await db.lots.orderBy('createdAt').reverse().toArray()).filter((l) => !l.deletedAt)
    const pieces = (await db.pieces.where('status').equals('in_stock').toArray()).filter((p) => !p.deletedAt)
    const lotById = new Map(lots.map((l) => [l.id, l]))
    const whole: SellableItem[] = lots
      .filter((l) => l.mode === 'whole' && l.qtyRemaining > 0)
      .map((l) => ({
        key: l.id, lotId: l.id, title: l.title, tagIds: l.tagIds, photoId: l.lotPhotoId, qtyRemaining: l.qtyRemaining,
        minPrice: l.minPrice, suggestedPrice: l.suggestedPrice, maxPrice: l.maxPrice, unitCost: l.unitCost,
      }))
    const single: SellableItem[] = pieces
      .filter((p) => lotById.has(p.lotId))
      .map((p) => ({
        key: p.id, lotId: p.lotId, pieceId: p.id, title: p.title, tagIds: p.tagIds,
        photoId: p.photoId ?? lotById.get(p.lotId)?.lotPhotoId, qtyRemaining: 1,
        minPrice: p.minPrice, suggestedPrice: p.suggestedPrice, maxPrice: p.maxPrice, unitCost: p.unitCost,
      }))
    return [...whole, ...single]
  }, [role])

export const matchesSearch = (item: { title: string; tagIds: string[] }, q: string, tagNames: Map<string, string>) => {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return item.title.toLowerCase().includes(s) || item.tagIds.some((id) => tagNames.get(id)?.toLowerCase().includes(s))
}
