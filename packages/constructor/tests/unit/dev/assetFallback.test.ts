import { describe, it, expect, vi } from 'vitest'
import {
  ASSET_PATH_PREFIX,
  DEFAULT_WORKER_ORIGIN,
  assetFallbackPlugin,
  createAssetFallbackMiddleware,
  readAssetFallbackEnv,
  resolveAssetUrls,
} from '@brand-constructor/shared/dev'

const PROD = 'https://brand-constructor-api-production.upstars-landings.workers.dev'
const ASSET_PATH = `${ASSET_PATH_PREFIX}component_thumbnail/cvr_1/ast_1.png`

const ON = { enabled: true, prodOrigin: PROD }

function upstream(status: number, body = 'png-bytes', contentType = 'image/png') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  }
}

function fakeResponse() {
  const calls: Array<{ status: number; headers: Record<string, string> }> = []
  return {
    calls,
    body: null as Uint8Array | null,
    writeHead(status: number, headers: Record<string, string>) {
      calls.push({ status, headers })
    },
    end(chunk: Uint8Array) {
      this.body = chunk
    },
  }
}

describe('readAssetFallbackEnv', () => {
  it('stays off when the env file says nothing', () => {
    expect(readAssetFallbackEnv({})).toEqual({ enabled: false, prodOrigin: '' })
  })

  it('turns on only when both variables are usable', () => {
    expect(readAssetFallbackEnv({ VITE_USE_PROD_ASSETS: 'true', VITE_PROD_API_ORIGIN: PROD })).toEqual(
      { enabled: true, prodOrigin: PROD },
    )
  })

  it('refuses to guess an origin', () => {
    expect(readAssetFallbackEnv({ VITE_USE_PROD_ASSETS: 'true' }).enabled).toBe(false)
    expect(
      readAssetFallbackEnv({ VITE_USE_PROD_ASSETS: 'true', VITE_PROD_API_ORIGIN: '  ' }).enabled,
    ).toBe(false)
  })

  it('treats anything other than "true" as off', () => {
    expect(
      readAssetFallbackEnv({ VITE_USE_PROD_ASSETS: 'false', VITE_PROD_API_ORIGIN: PROD }).enabled,
    ).toBe(false)
    expect(
      readAssetFallbackEnv({ VITE_USE_PROD_ASSETS: '1', VITE_PROD_API_ORIGIN: PROD }).enabled,
    ).toBe(false)
  })

  it('drops a trailing slash so joined paths keep one separator', () => {
    expect(
      readAssetFallbackEnv({ VITE_USE_PROD_ASSETS: 'true', VITE_PROD_API_ORIGIN: `${PROD}/` })
        .prodOrigin,
    ).toBe(PROD)
  })
})

describe('resolveAssetUrls', () => {
  it('asks the local worker before production', () => {
    expect(resolveAssetUrls(ASSET_PATH, ON)).toEqual([
      `${DEFAULT_WORKER_ORIGIN}${ASSET_PATH}`,
      `${PROD}${ASSET_PATH}`,
    ])
  })

  it('keeps the query string', () => {
    expect(resolveAssetUrls(`${ASSET_PATH}?v=2`, ON)[1]).toBe(`${PROD}${ASSET_PATH}?v=2`)
  })

  it('hands everything else back to the ordinary /api proxy', () => {
    expect(resolveAssetUrls('/api/components/types/ct_header/variants', ON)).toEqual([])
    expect(resolveAssetUrls('/wizard/step/7', ON)).toEqual([])
    expect(resolveAssetUrls(undefined, ON)).toEqual([])
  })

  it('does nothing at all while switched off', () => {
    expect(resolveAssetUrls(ASSET_PATH, { enabled: false, prodOrigin: PROD })).toEqual([])
    expect(resolveAssetUrls(ASSET_PATH, { enabled: true, prodOrigin: '' })).toEqual([])
  })
})

describe('createAssetFallbackMiddleware', () => {
  it('serves the local object and never touches production', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(upstream(200))
    const res = fakeResponse()
    const next = vi.fn()

    await createAssetFallbackMiddleware({ ...ON, fetchImpl })(
      { url: ASSET_PATH, method: 'GET' },
      res,
      next,
    )

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(`${DEFAULT_WORKER_ORIGIN}${ASSET_PATH}`)
    expect(res.calls[0].status).toBe(200)
    expect(res.calls[0].headers['Content-Type']).toBe('image/png')
    expect(res.calls[0].headers['Cache-Control']).toBe('no-store')
    expect(next).not.toHaveBeenCalled()
  })

  it('falls back to production when the local bucket has no such object', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(upstream(404, '{"error":"Asset not found"}', 'application/json'))
      .mockResolvedValueOnce(upstream(200))
    const res = fakeResponse()

    await createAssetFallbackMiddleware({ ...ON, fetchImpl })(
      { url: ASSET_PATH, method: 'GET' },
      res,
      vi.fn(),
    )

    expect(fetchImpl).toHaveBeenNthCalledWith(2, `${PROD}${ASSET_PATH}`)
    expect(res.calls[0].headers['Content-Type']).toBe('image/png')
  })

  it('falls back when the local worker is not running at all', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(upstream(200))
    const res = fakeResponse()

    await createAssetFallbackMiddleware({ ...ON, fetchImpl })(
      { url: ASSET_PATH, method: 'GET' },
      res,
      vi.fn(),
    )

    expect(res.calls).toHaveLength(1)
  })

  it('passes the request on when neither origin has it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(upstream(404))
    const res = fakeResponse()
    const next = vi.fn()

    await createAssetFallbackMiddleware({ ...ON, fetchImpl })(
      { url: ASSET_PATH, method: 'GET' },
      res,
      next,
    )

    expect(res.calls).toHaveLength(0)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('leaves uploads alone — only GET is intercepted', async () => {
    const fetchImpl = vi.fn()
    const next = vi.fn()

    await createAssetFallbackMiddleware({ ...ON, fetchImpl })(
      { url: ASSET_PATH, method: 'POST' },
      fakeResponse(),
      next,
    )

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('is inert while switched off', async () => {
    const fetchImpl = vi.fn()
    const next = vi.fn()

    await createAssetFallbackMiddleware({ enabled: false, prodOrigin: PROD, fetchImpl })(
      { url: ASSET_PATH, method: 'GET' },
      fakeResponse(),
      next,
    )

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('assetFallbackPlugin', () => {
  it('registers its middleware for the dev server only', () => {
    const plugin = assetFallbackPlugin(ON)
    const use = vi.fn()

    expect(plugin.apply).toBe('serve')
    plugin.configureServer({ middlewares: { use } })
    expect(use).toHaveBeenCalledTimes(1)
  })
})
