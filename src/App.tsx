import { BarChart3, Boxes, Home, Menu, ShoppingBag, Tag } from 'lucide-react'
import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { SyncBadge } from './components/SyncBadge.tsx'
import { Spinner } from './components/ui.tsx'
import { useAuth } from './lib/auth.ts'
import { cn } from './lib/cn.ts'
import { can, type Action } from './lib/roles.ts'
import { AddLotPage } from './pages/AddLotPage.tsx'
import { DuesPage } from './pages/DuesPage.tsx'
import { ExpensesPage } from './pages/ExpensesPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ItemsPage } from './pages/ItemsPage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { LotPage } from './pages/LotPage.tsx'
import { MorePage } from './pages/MorePage.tsx'
import { NoAccessPage } from './pages/NoAccessPage.tsx'
import { PartyPage } from './pages/PartyPage.tsx'
import { ReturnPage } from './pages/ReturnPage.tsx'
import { SalesPage } from './pages/SalesPage.tsx'
import { SellItemPage } from './pages/SellItemPage.tsx'
import { SellPage } from './pages/SellPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { StockPage } from './pages/StockPage.tsx'
import { TagsPage } from './pages/TagsPage.tsx'
import { UsersPage } from './pages/UsersPage.tsx'

// Stats pulls in the chart library, so it loads on first visit only.
const StatsPage = lazy(() => import('./pages/StatsPage.tsx').then((m) => ({ default: m.StatsPage })))

const Guard = ({ action, children }: { action: Action; children: ReactNode }) => {
  const role = useAuth((s) => s.profile?.role)
  return can(role, action) ? children : <Navigate to="/" replace />
}

const adminTabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/stock', label: 'Stock', icon: Boxes },
  { to: '/sell', label: 'Sell', icon: ShoppingBag },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/more', label: 'More', icon: Menu },
]
const workerTabs = [
  { to: '/', label: 'Items', icon: Tag },
  { to: '/sell', label: 'Sell', icon: ShoppingBag },
  { to: '/settings', label: 'Account', icon: Menu },
]

export const App = () => {
  const { status, profile } = useAuth()
  if (status === 'loading') return <div className="flex h-full items-center justify-center"><Spinner /></div>
  if (status === 'signedOut') return <LoginPage />
  if (status === 'noProfile' || !profile) return <NoAccessPage />

  const isWorker = profile.role === 'worker'
  const tabs = isWorker ? workerTabs : adminTabs

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-slate-50">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-sm text-slate-500" dir="auto">{profile.name} · {profile.role}</span>
        <SyncBadge />
      </div>
      <main className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
        <Routes>
          <Route path="/" element={isWorker ? <ItemsPage /> : <HomePage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/sell/:key" element={<SellItemPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stock" element={<Guard action="stock.manage"><StockPage /></Guard>} />
          <Route path="/stock/new" element={<Guard action="stock.manage"><AddLotPage /></Guard>} />
          <Route path="/stock/:id" element={<Guard action="stock.manage"><LotPage /></Guard>} />
          <Route path="/sales" element={<Guard action="stock.manage"><SalesPage /></Guard>} />
          <Route path="/sales/:id/return" element={<Guard action="stock.manage"><ReturnPage /></Guard>} />
          <Route path="/more" element={<Guard action="stock.manage"><MorePage /></Guard>} />
          <Route path="/stats" element={<Guard action="finance.view"><Suspense fallback={<Spinner />}><StatsPage /></Suspense></Guard>} />
          <Route path="/dues" element={<Guard action="finance.view"><DuesPage /></Guard>} />
          <Route path="/dues/:id" element={<Guard action="finance.view"><PartyPage /></Guard>} />
          <Route path="/expenses" element={<Guard action="finance.view"><ExpensesPage /></Guard>} />
          <Route path="/settings/tags" element={<Guard action="admin.manage"><TagsPage /></Guard>} />
          <Route path="/settings/users" element={<Guard action="admin.manage"><UsersPage /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav
        className="grid border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-xs', isActive ? 'font-semibold text-teal-700' : 'text-slate-500')}
          >
            <Icon className="size-6" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
