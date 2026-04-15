import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, __resetRateLimitStore } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => __resetRateLimitStore())

  const BASE_OPTS = { limit: 3, windowMs: 60_000 }

  it('limit 이하 요청은 모두 통과', () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) {
      const r = rateLimit({ ...BASE_OPTS, key: 'user:A', now })
      expect(r.ok).toBe(true)
    }
  })

  it('limit 초과 요청은 차단되고 retryAfterSec 가 반환된다', () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) rateLimit({ ...BASE_OPTS, key: 'user:A', now })

    const blocked = rateLimit({ ...BASE_OPTS, key: 'user:A', now })
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
    expect(blocked.remaining).toBe(0)
  })

  it('윈도우가 리셋되면 다시 허용된다', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 3; i++) rateLimit({ ...BASE_OPTS, key: 'user:A', now: t0 })

    const afterWindow = rateLimit({ ...BASE_OPTS, key: 'user:A', now: t0 + 60_000 + 1 })
    expect(afterWindow.ok).toBe(true)
    expect(afterWindow.remaining).toBe(2)
  })

  it('서로 다른 키는 독립적으로 카운트된다', () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) rateLimit({ ...BASE_OPTS, key: 'user:A', now })

    const b = rateLimit({ ...BASE_OPTS, key: 'user:B', now })
    expect(b.ok).toBe(true)
    expect(b.remaining).toBe(2)
  })

  it('remaining 은 limit - count 로 감소한다', () => {
    const now = 1_000_000
    const a = rateLimit({ ...BASE_OPTS, key: 'user:X', now })
    expect(a.remaining).toBe(2)
    const b = rateLimit({ ...BASE_OPTS, key: 'user:X', now })
    expect(b.remaining).toBe(1)
    const c = rateLimit({ ...BASE_OPTS, key: 'user:X', now })
    expect(c.remaining).toBe(0)
  })
})
