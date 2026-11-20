const toSnakeKey = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const toCamelKey = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

export const tableName = toSnakeKey

/** Local row to server row: snake_case keys, local-only fields dropped, undefined becomes null. */
export const toServer = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([k]) => k !== 'synced' && k !== 'syncedAt')
      .map(([k, v]) => [toSnakeKey(k), v === undefined ? null : v]),
  )

/** Server row to local row: camelCase keys, nulls dropped. */
export const toLocal = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [toCamelKey(k), v]),
  )
