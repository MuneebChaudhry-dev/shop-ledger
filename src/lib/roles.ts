export type Role = 'owner' | 'manager' | 'worker'

export type Action =
  | 'items.view'
  | 'sales.create'
  | 'stock.manage'
  | 'finance.view'
  | 'admin.manage'

const matrix: Record<Role, Action[]> = {
  owner: ['items.view', 'sales.create', 'stock.manage', 'finance.view', 'admin.manage'],
  manager: ['items.view', 'sales.create', 'stock.manage', 'finance.view'],
  worker: ['items.view', 'sales.create'],
}

export const can = (role: Role | undefined, action: Action): boolean =>
  role ? matrix[role].includes(action) : false
