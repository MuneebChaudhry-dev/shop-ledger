import { NavLink, Route, Routes } from 'react-router'
import { HomePage } from './pages/HomePage.tsx'
import { StockPage } from './pages/StockPage.tsx'
import { SellPage } from './pages/SellPage.tsx'
import { StatsPage } from './pages/StatsPage.tsx'
import { DuesPage } from './pages/DuesPage.tsx'

const tabs = [
  { to: '/', label: 'Home' },
  { to: '/stock', label: 'Stock' },
  { to: '/sell', label: 'Sell' },
  { to: '/stats', label: 'Stats' },
  { to: '/dues', label: 'Dues' },
]

export const App = () => (
  <div className="flex h-full flex-col">
    <main className="flex-1 overflow-y-auto p-4">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/dues" element={<DuesPage />} />
      </Routes>
    </main>
    <nav className="grid grid-cols-5 border-t bg-white">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          className={({ isActive }) =>
            `py-3 text-center text-sm ${isActive ? 'font-semibold text-teal-700' : 'text-slate-500'}`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  </div>
)
