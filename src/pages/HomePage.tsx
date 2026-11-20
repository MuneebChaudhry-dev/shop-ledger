import { Coffee, Plus, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, StatTile } from '../components/ui'
import { addExpense } from '../lib/actions'
import { useAuth } from '../lib/auth'
import { getPeriod } from '../lib/calc/periods'
import { formatRs } from '../lib/money'
import { can } from '../lib/roles'
import { useChaiDefault } from '../lib/settings'
import { useStats } from '../lib/useStats'

export const HomePage = () => {
  const navigate = useNavigate()
  const profile = useAuth((s) => s.profile)
  const today = useMemo(() => getPeriod('day', Date.now()), [])
  const result = useStats(today)
  const chai = useChaiDefault()
  const [chaiDone, setChaiDone] = useState(false)
  const s = result?.stats
  const finance = can(profile?.role, 'finance.view')

  return (
    <div className="space-y-4">
      <div>
        <p className="text-slate-500">Assalam o Alaikum{profile ? `, ${profile.name}` : ''}</p>
        <h1 className="text-2xl font-semibold">Today · {today.label}</h1>
      </div>
      {finance && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Earning" value={formatRs(s?.earning ?? 0)} />
          <StatTile label="Profit" value={formatRs(s?.profit ?? 0)} tone={(s?.profit ?? 0) < 0 ? 'bad' : 'good'} />
          <StatTile label="Pieces" value={s?.piecesSold ?? 0} />
        </div>
      )}
      <Button size="lg" className="h-20 w-full text-xl" onClick={() => navigate('/sell')}>
        <ShoppingBag className="size-7" /> Sell
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => navigate('/stock/new')}><Plus className="size-5" />Add stock</Button>
        <Button
          variant="secondary"
          disabled={chaiDone}
          onClick={async () => {
            await addExpense({ type: 'chai', name: 'Chai', amount: chai })
            setChaiDone(true)
            setTimeout(() => setChaiDone(false), 3000)
          }}
        >
          <Coffee className="size-5" />{chaiDone ? 'Chai added' : `Chai ${formatRs(chai)}`}
        </Button>
      </div>
      {finance && s && s.chai > 0 && <p className="text-sm text-slate-500">Chai today: {formatRs(s.chai)}</p>}
      {finance && (
        <Card onClick={() => navigate('/stats')}>
          <p className="font-medium">See full stats</p>
          <p className="text-sm text-slate-500">Weekly, bi-weekly and monthly profit</p>
        </Card>
      )}
    </div>
  )
}
