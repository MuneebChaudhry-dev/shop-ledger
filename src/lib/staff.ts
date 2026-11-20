import { loginToEmail } from './auth'
import { supabase } from './supabase'
import { syncNow } from './sync'

/** Owner only, online only: creates a login through the create-staff edge function. */
export const createStaff = async (input: { username: string; password: string; name: string; phone?: string; role: 'manager' | 'worker' }) => {
  if (!navigator.onLine) throw new Error('Connect to the internet to add staff')
  const { data, error } = await supabase.functions.invoke('create-staff', {
    body: { email: loginToEmail(input.username), password: input.password, name: input.name, phone: input.phone, role: input.role },
  })
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => undefined)
    throw new Error(body?.error ?? error.message)
  }
  await syncNow()
  return data as { id: string }
}
