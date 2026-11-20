import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { db, type Profile } from './db'
import { startSync, stopSync } from './sync'
import { supabase } from './supabase'

const PROFILE_KEY = 'shop-ledger:profile'
/** Staff log in with a username; it maps to this hidden email domain. */
export const STAFF_DOMAIN = 'staff.shopledger.app'

export const loginToEmail = (login: string): string => {
  const v = login.trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${STAFF_DOMAIN}`
}

type Status = 'loading' | 'signedOut' | 'signedIn' | 'noProfile'

interface AuthState {
  status: Status
  session?: Session
  profile?: Profile
}

export const useAuth = create<AuthState>(() => ({ status: 'loading' }))

const cachedProfile = (): Profile | undefined => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as Profile) : undefined
  } catch {
    return undefined
  }
}

const loadProfile = async (session: Session) => {
  const cached = cachedProfile()
  if (cached?.id === session.user.id) {
    useAuth.setState({ status: 'signedIn', session, profile: cached })
    startSync(cached.role)
  }
  if (!navigator.onLine) {
    if (cached?.id !== session.user.id) useAuth.setState({ status: 'noProfile', session })
    return
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  if (error) {
    if (cached?.id !== session.user.id) useAuth.setState({ status: 'noProfile', session })
    return
  }
  if (!data || !data.active) {
    // Disabled or removed: drop everything on this phone (it may hold costs and profit).
    stopSync()
    await resetLocalData()
    useAuth.setState({ status: 'noProfile', session, profile: undefined })
    return
  }
  if (cached && cached.id === data.id && cached.role !== data.role) {
    // Role changed (for example manager to worker): start clean so old cost data does not stay behind.
    stopSync()
    await resetLocalData()
  }
  const profile: Profile = {
    id: data.id, name: data.name, phone: data.phone ?? undefined, role: data.role, active: data.active,
    createdAt: data.created_at, updatedAt: data.updated_at, synced: 1,
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  useAuth.setState({ status: 'signedIn', session, profile })
  startSync(profile.role)
}

export const initAuth = async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) await loadProfile(data.session)
  else useAuth.setState({ status: 'signedOut' })
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      stopSync()
      useAuth.setState({ status: 'signedOut', session: undefined, profile: undefined })
    }
    if (event === 'TOKEN_REFRESHED' && session) useAuth.setState({ session })
  })
}

export const resetLocalData = async () => {
  localStorage.removeItem(PROFILE_KEY)
  db.close()
  await db.delete()
  await db.open()
}

export const pendingCount = async () => (await db.outbox.count()) + (await db.photos.where('uploaded').equals(0).count())

export const signIn = async (login: string, password: string): Promise<string | null> => {
  const previous = cachedProfile()
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password })
  if (error || !data.session) return error?.message ?? 'Could not sign in'
  if (previous && previous.id !== data.session.user.id) {
    // A different person on this phone. Never wipe someone else's unsynced work silently.
    const pending = await pendingCount()
    if (pending > 0) {
      await supabase.auth.signOut()
      return `${previous.name} has ${pending} changes on this phone that are not uploaded yet. Sign in as ${previous.name} while online so they upload first.`
    }
    await resetLocalData()
  }
  await loadProfile(data.session)
  return null
}

/** Returns false (and does nothing) if there are unsynced changes, unless forced. */
export const signOut = async (force = false): Promise<boolean> => {
  if ((await pendingCount()) > 0 && !force) return false
  stopSync()
  await supabase.auth.signOut()
  await resetLocalData()
  useAuth.setState({ status: 'signedOut', session: undefined, profile: undefined })
  return true
}
