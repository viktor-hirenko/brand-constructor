import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { logAuthLoginAttempt } from '../../../src/utils/auth-login-log'

describe('logAuthLoginAttempt', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs success as console.log with auth_login event', () => {
    logAuthLoginAttempt({
      outcome: 'success',
      ip: '1.2.3.4',
      email: 'user@upstars.com',
      httpStatus: 200,
    })

    expect(console.log).toHaveBeenCalledOnce()
    const line = JSON.parse(String(vi.mocked(console.log).mock.calls[0][0]))
    expect(line.event).toBe('auth_login')
    expect(line.outcome).toBe('success')
    expect(line.email).toBe('user@upstars.com')
    expect(line.emailDomain).toBe('upstars.com')
  })

  it('logs failures as console.warn with outcome and email', () => {
    logAuthLoginAttempt({
      outcome: 'domain_not_allowed',
      ip: '1.2.3.4',
      email: 'user@gmail.com',
      httpStatus: 403,
      allowedEmailDomains: 'upstars.com',
    })

    expect(console.warn).toHaveBeenCalledOnce()
    const line = JSON.parse(String(vi.mocked(console.warn).mock.calls[0][0]))
    expect(line.outcome).toBe('domain_not_allowed')
    expect(line.email).toBe('user@gmail.com')
    expect(line.allowedEmailDomains).toBe('upstars.com')
  })
})
