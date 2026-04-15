/**
 * lib/rate-limit.ts
 *
 * 간단한 **고정 윈도우** 기반 in-memory rate limiter.
 *
 * [포트폴리오 한정 설계]
 * Node.js 프로세스 메모리만 사용하므로
 *  - 여러 서버 인스턴스(Vercel 멀티 리전/서버리스 콜드 스타트)에서는 정확하지 않다
 *  - 프로세스가 재시작되면 카운터가 초기화된다
 *
 * 그럼에도 불구하고 도입한 이유:
 *  1. 포트폴리오에 외부 의존성(Upstash Redis 등)을 늘리지 않기 위함
 *  2. 단일 인스턴스 개발/시연 환경에서는 "과한 연타" 방어에 충분
 *  3. 프로덕션 이전 시 key 해시 구조를 유지한 채 Redis 구현체로 교체 가능
 *
 * 프로덕션 이전 가이드는 docs/adr/0002-in-memory-rate-limiting.md 참고.
 *
 * [사용]
 *   const { ok, retryAfterSec } = rateLimit({ key: `orders:${userId}`, limit: 10, windowMs: 60000 })
 *   if (!ok) return 429
 */

type Bucket = { count: number; resetAt: number }

// 키별 윈도우 상태. 모듈 수준 전역이라 서버리스 워밍된 인스턴스 내에서만 공유된다.
const buckets = new Map<string, Bucket>()

// 간단한 GC: 최대 크기 초과시 만료된 항목 제거 (메모리 leak 방지)
const MAX_BUCKETS = 10_000

function gc(now: number): void {
  if (buckets.size < MAX_BUCKETS) return
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k)
  }
}

export type RateLimitOptions = {
  /** 식별 키. 예: `orders:create:${userId}` 또는 `ip:${ip}` */
  key: string
  /** 윈도우당 허용 요청 수 */
  limit: number
  /** 윈도우 길이(ms) */
  windowMs: number
  /** 현재 시각 주입용 (테스트 전용) */
  now?: number
}

export type RateLimitResult = {
  ok: boolean
  /** 남은 허용 요청 수 */
  remaining: number
  /** 윈도우 리셋까지 남은 시간(초). 클라이언트에 Retry-After 헤더로 반환 가능 */
  retryAfterSec: number
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = opts.now ?? Date.now()
  gc(now)

  const existing = buckets.get(opts.key)

  // 윈도우 만료 또는 최초 요청 → 새 버킷
  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs })
    return {
      ok: true,
      remaining: opts.limit - 1,
      retryAfterSec: Math.ceil(opts.windowMs / 1000),
    }
  }

  // 윈도우 내 — 증가
  existing.count += 1
  const remaining = Math.max(0, opts.limit - existing.count)
  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))

  return {
    ok: existing.count <= opts.limit,
    remaining,
    retryAfterSec,
  }
}

/** 테스트 전용: 내부 상태 초기화 */
export function __resetRateLimitStore(): void {
  buckets.clear()
}
