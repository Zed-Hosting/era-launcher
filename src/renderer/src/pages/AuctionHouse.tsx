import { useEffect, useState, useCallback } from 'react'
import { Search, Gavel, ShoppingCart, List, Mail, Plus, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../lib/utils'

const AH_URL = 'http://127.0.0.1:3001'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Listing {
  id: number
  seller: string
  item_name: string
  quantity: number
  min_bid: number
  buyout_price: number | null
  current_bid: number | null
  current_bidder: string | null
  status: string
  expires_at: number
  timeLeft: string
  houseCutPct: number
  bids?: BidRecord[]
}

interface BidRecord {
  id: number
  bidder: string
  amount: number
  placed_at: number
}

interface Delivery {
  id: number
  type: 'gold' | 'item'
  gold_amount?: number
  item_name?: string
  quantity?: number
  note: string
}

interface PlayerData {
  username: string
  balance: number
  listings: Listing[]
  bids: Listing[]
  mailbox: Delivery[]
}

type AHTab = 'browse' | 'sell' | 'mylistings' | 'mybids' | 'mailbox'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gold(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toLocaleString()}g`
}

async function ahFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${AH_URL}${path}`, opts)
  return r.json()
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AuctionHousePage(): JSX.Element {
  const [username, setUsername] = useState<string>('')
  const [confirmed, setConfirmed] = useState(false)
  const [tab, setTab] = useState<AHTab>('browse')
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [sidecarOnline, setSidecarOnline] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check sidecar
  useEffect(() => {
    fetch(`${AH_URL}/ah/health`)
      .then(() => setSidecarOnline(true))
      .catch(() => setSidecarOnline(false))
  }, [])

  const loadPlayer = useCallback(async (name: string) => {
    try {
      const data = await ahFetch(`/ah/player/${encodeURIComponent(name)}`)
      setPlayer(data)
    } catch {
      setError('Could not load player data.')
    }
  }, [])

  useEffect(() => {
    if (confirmed && username) {
      void loadPlayer(username)
      const t = setInterval(() => void loadPlayer(username), 15_000)
      return () => clearInterval(t)
    }
  }, [confirmed, username, loadPlayer])

  if (sidecarOnline === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Gavel size={40} className="opacity-40" />
        <p className="text-sm">Auction House sidecar is not running.</p>
        <p className="text-xs">Start <code className="rounded bg-muted px-1">ah-sidecar</code> alongside the STR server.</p>
      </div>
    )
  }

  if (!confirmed) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 pt-16">
        <div className="flex items-center gap-3">
          <Gavel size={28} className="text-primary" />
          <h1 className="text-xl font-semibold">Auction House</h1>
        </div>
        <p className="text-sm text-muted-foreground">Enter your in-game username to continue.</p>
        <input
          className="input"
          placeholder="Your STR username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && username.trim() && setConfirmed(true)}
        />
        <button
          className="btn-primary"
          disabled={!username.trim()}
          onClick={() => setConfirmed(true)}
        >
          Enter Auction House
        </button>
      </div>
    )
  }

  const tabs: { id: AHTab; label: string; icon: React.ReactNode }[] = [
    { id: 'browse',     label: 'Browse',      icon: <Search size={14} /> },
    { id: 'sell',       label: 'Sell',         icon: <Plus size={14} /> },
    { id: 'mylistings', label: 'My Listings',  icon: <List size={14} /> },
    { id: 'mybids',     label: 'My Bids',      icon: <Gavel size={14} /> },
    { id: 'mailbox',    label: `Mailbox${player && player.mailbox.length > 0 ? ` (${player.mailbox.length})` : ''}`, icon: <Mail size={14} /> },
  ]

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel size={20} className="text-primary" />
          <span className="font-semibold">Auction House</span>
          <span className="text-xs text-muted-foreground ml-1">— {username}</span>
        </div>
        <div className="flex items-center gap-3">
          {player && (
            <span className="text-sm font-medium text-amber-400">{gold(player.balance)}</span>
          )}
          <button
            onClick={() => void loadPlayer(username)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => { setConfirmed(false); setUsername('') }}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Switch user"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t transition-colors',
              tab === t.id
                ? 'bg-card border border-b-card border-border text-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'browse'     && <BrowseTab username={username} onRefresh={() => void loadPlayer(username)} />}
        {tab === 'sell'       && <SellTab username={username} balance={player?.balance ?? 0} onDone={() => { setTab('mylistings'); void loadPlayer(username) }} />}
        {tab === 'mylistings' && <MyListingsTab listings={player?.listings ?? []} username={username} onRefresh={() => void loadPlayer(username)} />}
        {tab === 'mybids'     && <MyBidsTab bids={player?.bids ?? []} />}
        {tab === 'mailbox'    && <MailboxTab deliveries={player?.mailbox ?? []} username={username} onRefresh={() => void loadPlayer(username)} />}
      </div>
    </div>
  )
}

// ── Browse tab ────────────────────────────────────────────────────────────────

function BrowseTab({ username, onRefresh }: { username: string; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Listing | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const load = useCallback(async (q = search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: '0', pageSize: '30' })
      if (q.trim()) params.set('search', q.trim())
      const data: Listing[] = await ahFetch(`/ah/listings?${params}`)
      setListings(data)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { void load() }, []) // eslint-disable-line

  const openDetail = async (l: Listing) => {
    const data: Listing = await ahFetch(`/ah/listings/${l.id}`)
    setSelected(data)
    setBidAmount(String((data.current_bid ?? data.min_bid - 1) + 1))
  }

  const doBid = async () => {
    if (!selected) return
    const result = await ahFetch('/ah/bid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, listingId: selected.id, amount: +bidAmount })
    })
    setStatus(result.ok ? `Bid placed: ${gold(+bidAmount)}` : result.error)
    if (result.ok) { setSelected(null); void load(); onRefresh() }
  }

  const doBuyout = async () => {
    if (!selected?.buyout_price) return
    const result = await ahFetch('/ah/buyout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, listingId: selected.id })
    })
    setStatus(result.ok ? `Bought "${selected.item_name}" for ${gold(selected.buyout_price)}!` : result.error)
    if (result.ok) { setSelected(null); void load(); onRefresh() }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void load()}
        />
        <button className="btn-primary flex items-center gap-1" onClick={() => void load()} disabled={loading}>
          <Search size={14} />{loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {status && (
        <div className="rounded bg-primary/10 border border-primary/30 px-3 py-1.5 text-sm">
          {status}
        </div>
      )}

      {/* Listing detail modal */}
      {selected && (
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold">{selected.item_name} ×{selected.quantity}</div>
              <div className="text-xs text-muted-foreground">Seller: {selected.seller} · {selected.timeLeft} left</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Min bid: <span className="font-medium text-amber-400">{gold(selected.min_bid)}</span></div>
            {selected.buyout_price && <div>Buyout: <span className="font-medium text-green-400">{gold(selected.buyout_price)}</span></div>}
            {selected.current_bid && <div>Top bid: <span className="font-medium">{gold(selected.current_bid)} by {selected.current_bidder}</span></div>}
          </div>
          {selected.bids && selected.bids.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Bid history</div>
              <div className="space-y-0.5">
                {selected.bids.slice(0, 5).map(b => (
                  <div key={b.id} className="flex justify-between text-xs">
                    <span>{b.bidder}</span><span className="text-amber-400">{gold(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 items-center mt-1">
            <input
              className="input w-28"
              type="number"
              min={1}
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder="Bid amount"
            />
            <button className="btn-outline flex items-center gap-1" onClick={doBid}>
              <Gavel size={13} /> Place Bid
            </button>
            {selected.buyout_price && (
              <button className="btn-primary flex items-center gap-1" onClick={doBuyout}>
                <ShoppingCart size={13} /> Buyout {gold(selected.buyout_price)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Listings table */}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Min Bid</th>
              <th className="px-3 py-2 text-right">Buyout</th>
              <th className="px-3 py-2 text-right">Top Bid</th>
              <th className="px-3 py-2 text-right">Time Left</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground text-xs">No listings found.</td></tr>
            )}
            {listings.map(l => (
              <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 font-medium">{l.item_name}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{l.quantity}</td>
                <td className="px-3 py-2 text-right text-amber-400">{gold(l.min_bid)}</td>
                <td className="px-3 py-2 text-right text-green-400">{l.buyout_price ? gold(l.buyout_price) : '—'}</td>
                <td className="px-3 py-2 text-right">{l.current_bid ? gold(l.current_bid) : '—'}</td>
                <td className="px-3 py-2 text-right text-xs text-muted-foreground">{l.timeLeft}</td>
                <td className="px-3 py-2">
                  <button className="btn-outline text-xs py-0.5 px-2" onClick={() => void openDetail(l)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Sell tab ──────────────────────────────────────────────────────────────────

function SellTab({ username, balance, onDone }: { username: string; balance: number; onDone: () => void }) {
  const [itemName, setItemName]       = useState('')
  const [minBid, setMinBid]           = useState('')
  const [buyout, setBuyout]           = useState('')
  const [hours, setHours]             = useState('48')
  const [submitting, setSubmitting]   = useState(false)
  const [result, setResult]           = useState<string | null>(null)

  const deposit = minBid ? Math.max(1, Math.floor(+minBid * 0.01 * (+hours / 12))) : 0

  const submit = async () => {
    if (!itemName.trim() || !minBid) return
    setSubmitting(true)
    try {
      const data = await ahFetch('/ah/sell', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          itemName: itemName.trim(),
          minBid: +minBid,
          buyoutPrice: buyout ? +buyout : undefined,
          durationHours: +hours
        })
      })
      if (data.ok) {
        setResult(`Listed! Listing ID: #${data.listingId} — Place the item in the Auction Chest.`)
        setTimeout(onDone, 2500)
      } else {
        setResult(`Error: ${data.error}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md flex flex-col gap-4">
      <h2 className="font-semibold">Create Listing</h2>
      <p className="text-xs text-amber-300 rounded border border-amber-400/30 bg-amber-400/10 px-3 py-2">
        After listing, place the item in the <strong>Auction Chest</strong> in-game. The listing is active immediately.
      </p>

      {result && (
        <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm">{result}</div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Item name
        <input className="input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Daedric Sword" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Min bid (gold)
          <input className="input" type="number" min={1} value={minBid} onChange={e => setMinBid(e.target.value)} placeholder="100" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Buyout price (optional)
          <input className="input" type="number" min={1} value={buyout} onChange={e => setBuyout(e.target.value)} placeholder="500" />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Duration
        <select className="input" value={hours} onChange={e => setHours(e.target.value)}>
          <option value="12">12 hours</option>
          <option value="24">24 hours</option>
          <option value="48">48 hours (default)</option>
          <option value="72">72 hours</option>
        </select>
      </label>

      <div className="rounded border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
        <div>Deposit fee: <span className="text-foreground">{deposit}g</span> (non-refundable on cancel)</div>
        <div>House cut on sale: <span className="text-foreground">5%</span></div>
        <div>Your balance: <span className="text-amber-400">{gold(balance)}</span></div>
      </div>

      <button className="btn-primary" disabled={!itemName.trim() || !minBid || submitting} onClick={submit}>
        {submitting ? 'Listing…' : 'Create Listing'}
      </button>
    </div>
  )
}

// ── My Listings tab ───────────────────────────────────────────────────────────

function MyListingsTab({ listings, username, onRefresh }: { listings: Listing[]; username: string; onRefresh: () => void }) {
  const [status, setStatus] = useState<string | null>(null)

  const cancel = async (id: number) => {
    const result = await ahFetch('/ah/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, listingId: id })
    })
    setStatus(result.ok ? 'Listing cancelled.' : `Error: ${result.error}`)
    if (result.ok) onRefresh()
  }

  if (!listings.length) return (
    <div className="text-sm text-muted-foreground pt-4">You have no listings.</div>
  )

  return (
    <div className="flex flex-col gap-3">
      {status && <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm">{status}</div>}
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Min Bid</th>
              <th className="px-3 py-2 text-right">Top Bid</th>
              <th className="px-3 py-2 text-right">Buyout</th>
              <th className="px-3 py-2 text-right">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {listings.map(l => (
              <tr key={l.id} className="border-b border-border/50">
                <td className="px-3 py-2 text-muted-foreground text-xs">{l.id}</td>
                <td className="px-3 py-2 font-medium">{l.item_name} ×{l.quantity}</td>
                <td className="px-3 py-2 text-right text-amber-400">{gold(l.min_bid)}</td>
                <td className="px-3 py-2 text-right">{l.current_bid ? gold(l.current_bid) : '—'}</td>
                <td className="px-3 py-2 text-right text-green-400">{l.buyout_price ? gold(l.buyout_price) : '—'}</td>
                <td className="px-3 py-2 text-right text-xs">
                  {l.status === 'active' ? (
                    <span className="text-green-400">{l.timeLeft}</span>
                  ) : (
                    <span className="text-muted-foreground">{l.status}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {l.status === 'active' && !l.current_bid && (
                    <button className="btn-outline text-xs py-0.5 px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => void cancel(l.id)}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── My Bids tab ───────────────────────────────────────────────────────────────

function MyBidsTab({ bids }: { bids: Listing[] }) {
  if (!bids.length) return (
    <div className="text-sm text-muted-foreground pt-4">You have no active bids.</div>
  )
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-right">Your Bid</th>
            <th className="px-3 py-2 text-right">Status</th>
            <th className="px-3 py-2 text-right">Time Left</th>
          </tr>
        </thead>
        <tbody>
          {bids.map(l => (
            <tr key={l.id} className="border-b border-border/50">
              <td className="px-3 py-2 font-medium">{l.item_name} ×{l.quantity}</td>
              <td className="px-3 py-2 text-right text-amber-400">{gold((l as any).my_bid)}</td>
              <td className="px-3 py-2 text-right text-xs">
                {(l as any).current_bidder === (l as any)._username
                  ? <span className="text-green-400">Winning</span>
                  : <span className="text-red-400">Outbid</span>
                }
              </td>
              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{l.timeLeft}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Mailbox tab ───────────────────────────────────────────────────────────────

function MailboxTab({ deliveries, username, onRefresh }: { deliveries: Delivery[]; username: string; onRefresh: () => void }) {
  const [status, setStatus] = useState<string | null>(null)

  const claim = async (id: number) => {
    const result = await ahFetch('/ah/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, deliveryId: id })
    })
    // Re-use the message field from commands if available
    setStatus(result.ok ? 'Delivery claimed!' : 'Failed to claim delivery.')
    if (result.ok) onRefresh()
  }

  if (!deliveries.length) return (
    <div className="text-sm text-muted-foreground pt-4">Your AH mailbox is empty.</div>
  )

  return (
    <div className="flex flex-col gap-2">
      {status && <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm">{status}</div>}
      {deliveries.map(d => (
        <div key={d.id} className="flex items-center justify-between rounded border border-border bg-card/40 px-3 py-2">
          <div>
            {d.type === 'gold' ? (
              <span className="text-sm">
                <span className="text-amber-400 font-medium">{gold(d.gold_amount)}</span>
                <span className="text-muted-foreground text-xs ml-2">{d.note}</span>
              </span>
            ) : (
              <span className="text-sm">
                <span className="font-medium">{d.item_name}</span>
                {d.quantity && d.quantity > 1 && <span className="text-muted-foreground"> ×{d.quantity}</span>}
                <span className="text-muted-foreground text-xs ml-2">{d.note}</span>
              </span>
            )}
          </div>
          <button className="btn-primary text-xs py-0.5 px-3" onClick={() => void claim(d.id)}>
            {d.type === 'gold' ? 'Collect Gold' : 'Collect Item'}
          </button>
        </div>
      ))}
    </div>
  )
}
