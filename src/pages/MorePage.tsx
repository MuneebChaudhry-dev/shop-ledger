import { ChevronRight, Coins, Receipt, Settings, Tags, Undo2, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { useNavigate } from 'react-router'
import { Card, PageHeader } from '../components/ui'
import { useAuth } from '../lib/auth'
import { can, type Action } from '../lib/roles'

const links: { to: string; label: string; hint: string; icon: ComponentType<{ className?: string }>; action: Action }[] = [
  { to: '/dues', label: 'Dues', hint: 'What you owe creditors, record payments', icon: Coins, action: 'finance.view' },
  { to: '/sales', label: 'Sales and returns', hint: 'Recent sales, customer returns', icon: Undo2, action: 'stock.manage' },
  { to: '/expenses', label: 'Expenses', hint: 'Chai and month-end costs', icon: Receipt, action: 'finance.view' },
  { to: '/settings/tags', label: 'Tags', hint: 'Categories for stock', icon: Tags, action: 'admin.manage' },
  { to: '/settings/users', label: 'Users', hint: 'Managers and workers', icon: Users, action: 'admin.manage' },
  { to: '/settings', label: 'Settings', hint: 'Sync, prices, chai, backup', icon: Settings, action: 'stock.manage' },
]

export const MorePage = () => {
  const navigate = useNavigate()
  const role = useAuth((s) => s.profile?.role)
  return (
    <div className="space-y-2">
      <PageHeader title="More" />
      {links.filter((l) => can(role, l.action)).map(({ to, label, hint, icon: Icon }) => (
        <Card key={to} onClick={() => navigate(to)} className="flex items-center gap-3 p-3">
          <Icon className="size-6 text-teal-700" />
          <div className="flex-1">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-slate-500">{hint}</p>
          </div>
          <ChevronRight className="size-5 text-slate-400" />
        </Card>
      ))}
    </div>
  )
}
