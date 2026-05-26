import { describe, expect, it } from 'vitest'
import {
  corporateEmailDenialMessage,
  isCorporateEmailAllowed,
} from '../../../src/utils/email-access'

describe('isCorporateEmailAllowed', () => {
  it('disables the gate when env is unset or empty', () => {
    expect(isCorporateEmailAllowed('anyone@gmail.com', undefined)).toBe(true)
    expect(isCorporateEmailAllowed('anyone@gmail.com', '')).toBe(true)
    expect(isCorporateEmailAllowed('anyone@gmail.com', '   ')).toBe(true)
  })

  it('admits only configured domains, case-insensitive', () => {
    expect(isCorporateEmailAllowed('user@upstars.com', 'upstars.com')).toBe(true)
    expect(isCorporateEmailAllowed('User@UpStars.COM', 'upstars.com')).toBe(true)
    expect(isCorporateEmailAllowed('user@gmail.com', 'upstars.com')).toBe(false)
  })

  it('supports multiple domains (local dev / staging)', () => {
    const env = 'upstars.com, gmail.com'
    expect(isCorporateEmailAllowed('a@upstars.com', env)).toBe(true)
    expect(isCorporateEmailAllowed('b@gmail.com', env)).toBe(true)
    expect(isCorporateEmailAllowed('c@evil.com', env)).toBe(false)
  })

  it('rejects malformed emails', () => {
    expect(isCorporateEmailAllowed('not-an-email', 'upstars.com')).toBe(false)
    expect(isCorporateEmailAllowed('@upstars.com', 'upstars.com')).toBe(false)
    expect(isCorporateEmailAllowed('user@', 'upstars.com')).toBe(false)
  })
})

describe('corporateEmailDenialMessage', () => {
  it('lists configured domains', () => {
    expect(corporateEmailDenialMessage('upstars.com')).toContain('@upstars.com')
    expect(corporateEmailDenialMessage('upstars.com,gmail.com')).toContain('@upstars.com, @gmail.com')
  })
})
