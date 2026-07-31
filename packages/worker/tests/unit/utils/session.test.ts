import { describe, expect, it } from 'vitest'
import {
  SESSION_ABSOLUTE_SEC,
  SESSION_IDLE_SEC,
  SESSION_REFRESH_AFTER_SEC,
  isSessionCapExceeded,
  sessionAnchor,
  shouldRefreshSession,
} from '../../../src/utils/session'

const NOW = 1_800_000_000

describe('sessionAnchor', () => {
  it('uses sid when present', () => {
    expect(sessionAnchor({ iat: NOW, sid: NOW - 3600 })).toBe(NOW - 3600)
  })

  it('falls back to iat for tokens minted before rolling sessions existed', () => {
    // Guarantees live sessions survive the deploy: without sid, the anchor is
    // the token's own iat, which is exactly what CSRF used to be keyed off.
    expect(sessionAnchor({ iat: NOW })).toBe(NOW)
  })
})

describe('isSessionCapExceeded', () => {
  it('admits a session inside the absolute cap', () => {
    expect(isSessionCapExceeded(NOW - SESSION_ABSOLUTE_SEC + 60, NOW)).toBe(false)
  })

  it('rejects a session past the absolute cap', () => {
    expect(isSessionCapExceeded(NOW - SESSION_ABSOLUTE_SEC - 1, NOW)).toBe(true)
  })

  it('admits a session started this instant', () => {
    expect(isSessionCapExceeded(NOW, NOW)).toBe(false)
  })
})

describe('shouldRefreshSession', () => {
  it('does not refresh a freshly minted token', () => {
    expect(shouldRefreshSession(NOW, NOW)).toBe(false)
  })

  it('does not refresh before the halfway mark', () => {
    expect(shouldRefreshSession(NOW - SESSION_REFRESH_AFTER_SEC + 1, NOW)).toBe(false)
  })

  it('refreshes once past the halfway mark', () => {
    expect(shouldRefreshSession(NOW - SESSION_REFRESH_AFTER_SEC, NOW)).toBe(true)
  })

  it('keeps an active user signed in well inside the idle window', () => {
    // The point of the sliding refresh: a request arriving at any time before
    // the idle window elapses renews the cookie, so continuous work never
    // ends in a surprise logout.
    const justBeforeIdleExpiry = NOW - SESSION_IDLE_SEC + 1
    expect(shouldRefreshSession(justBeforeIdleExpiry, NOW)).toBe(true)
  })
})

describe('session policy', () => {
  it('refreshes at half the idle window', () => {
    expect(SESSION_REFRESH_AFTER_SEC).toBe(SESSION_IDLE_SEC / 2)
  })

  it('caps total lifetime well above the idle window', () => {
    expect(SESSION_ABSOLUTE_SEC).toBeGreaterThan(SESSION_IDLE_SEC)
  })
})
