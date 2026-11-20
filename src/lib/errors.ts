export interface FriendlyError {
  title: string
  hint?: string
  /** Original technical message, shown small so it can be reported. */
  detail?: string
}

const rules: { test: RegExp; title: string; hint?: string }[] = [
  { test: /invalid login credentials|invalid_credentials/i, title: 'Wrong username or password', hint: 'Check the spelling and capital letters. If you forgot it, ask the owner to reset it.' },
  { test: /email not confirmed/i, title: 'This login is not activated yet', hint: 'In Supabase, open Authentication > Users and confirm this user (or create it again with Auto Confirm ticked).' },
  { test: /user (already )?(registered|exists)|already been registered|duplicate key.*(email|users)/i, title: 'That username is already taken', hint: 'Choose a different username.' },
  { test: /failed to fetch|networkerror|network request failed|load failed|err_internet|fetch failed/i, title: 'No internet connection', hint: 'Your work is saved on this phone and will upload when the internet is back.' },
  { test: /jwt expired|refresh token|session.*(expired|missing)|not signed in|invalid jwt/i, title: 'Your session has expired', hint: 'Sign out and sign in again while online.' },
  { test: /row-level security|permission denied|42501|only the owner|not allowed|forbidden|403/i, title: 'You do not have permission for this', hint: 'Ask the owner if you need access.' },
  { test: /rate limit|too many requests|429/i, title: 'Too many tries', hint: 'Wait a minute, then try again.' },
  { test: /password.*(at least|short|6)/i, title: 'Password is too short', hint: 'Use at least 6 characters.' },
  { test: /could not read that photo|image/i, title: 'Could not use that photo', hint: 'Take the photo again, or pick a different one.' },
  { test: /edge function|functions? .*not found|404/i, title: 'Server feature not set up', hint: 'The developer needs to deploy it (npx supabase functions deploy create-staff).' },
]

const messageOf = (e: unknown): string => {
  if (!e) return ''
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

/**
 * Turn any error into a short title, a hint on what to do, and the raw detail.
 * Messages we write ourselves (validation like "Only 3 in stock") are already friendly and pass through.
 */
export const friendlyError = (e: unknown): FriendlyError | undefined => {
  const raw = messageOf(e).trim()
  if (!raw) return undefined
  const rule = rules.find((r) => r.test.test(raw))
  if (rule) return { title: rule.title, hint: rule.hint, detail: rule.title.toLowerCase() === raw.toLowerCase() ? undefined : raw }
  // Our own validation messages are short sentences without technical codes.
  const looksTechnical = /[_{}():]|\b[0-9a-f]{8}-|code|sql|violat|constraint|undefined|null/i.test(raw)
  return looksTechnical ? { title: 'Something went wrong', hint: 'Try again. If it keeps happening, send a screenshot of this to the developer.', detail: raw } : { title: raw }
}
