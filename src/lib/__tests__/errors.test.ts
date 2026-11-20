import { describe, expect, it } from 'vitest'
import { friendlyError } from '../errors'

describe('friendlyError', () => {
  it('maps Supabase auth errors to plain words', () => {
    expect(friendlyError('Invalid login credentials')).toMatchObject({ title: 'Wrong username or password', detail: 'Invalid login credentials' })
    expect(friendlyError(new Error('Email not confirmed'))?.title).toBe('This login is not activated yet')
    expect(friendlyError({ message: 'A user with this email address has already been registered' })?.title).toBe('That username is already taken')
  })
  it('maps network, permission and session problems', () => {
    expect(friendlyError(new TypeError('Failed to fetch'))?.title).toBe('No internet connection')
    expect(friendlyError('lots: new row violates row-level security policy for table "lots"')?.title).toBe('You do not have permission for this')
    expect(friendlyError('JWT expired')?.title).toBe('Your session has expired')
  })
  it('passes our own validation messages through unchanged', () => {
    expect(friendlyError('Only 3 in stock')).toEqual({ title: 'Only 3 in stock' })
    expect(friendlyError('Title, quantity and total cost are required')).toEqual({ title: 'Title, quantity and total cost are required' })
  })
  it('hides unknown technical errors behind a general title but keeps the detail', () => {
    const f = friendlyError('pull lots: column "foo_bar" does not exist')
    expect(f?.title).toBe('Something went wrong')
    expect(f?.detail).toContain('foo_bar')
  })
  it('returns nothing for empty input', () => {
    expect(friendlyError(undefined)).toBeUndefined()
    expect(friendlyError('')).toBeUndefined()
  })
})
