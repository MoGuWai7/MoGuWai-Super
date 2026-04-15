/**
 * lib/logger.ts
 *
 * 구조화 로깅 유틸 (외부 의존성 없음).
 *
 * [왜 직접 구현했나]
 * 포트폴리오 수준에서 pino/winston 같은 라이브러리를 도입하는 것은 과한 의존성이다.
 * Vercel 배포 환경에서는 `console.*` 출력이 이미 Vercel Logs로 수집되며,
 * JSON 한 줄만 출력하면 Logs 검색·필터링이 바로 가능하다.
 *
 * [형식]
 * 각 로그는 JSON 한 줄:
 *   { ts, level, msg, ...context }
 *
 * child() 로 공통 컨텍스트(route, userId 등)를 미리 꽂아 둘 수 있다.
 *
 * [프로덕션 이전 가이드]
 * Sentry/Datadog 등으로 보강할 때는 이 파일만 교체하면 되도록
 * 호출 측은 logger.info / warn / error 만 의존한다.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

// 환경변수 LOG_LEVEL 로 임계치 조정 가능 (기본: production='info', 나머지='debug')
const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]
}

function emit(level: LogLevel, msg: string, context: LogContext): void {
  if (!shouldLog(level)) return
  const record = { ts: new Date().toISOString(), level, msg, ...context }
  const line = JSON.stringify(record)

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export type Logger = {
  debug: (msg: string, context?: LogContext) => void
  info: (msg: string, context?: LogContext) => void
  warn: (msg: string, context?: LogContext) => void
  error: (msg: string, context?: LogContext) => void
  child: (bindings: LogContext) => Logger
}

function make(base: LogContext): Logger {
  return {
    debug: (msg, ctx = {}) => emit('debug', msg, { ...base, ...ctx }),
    info: (msg, ctx = {}) => emit('info', msg, { ...base, ...ctx }),
    warn: (msg, ctx = {}) => emit('warn', msg, { ...base, ...ctx }),
    error: (msg, ctx = {}) => emit('error', msg, { ...base, ...ctx }),
    child: (bindings) => make({ ...base, ...bindings }),
  }
}

export const logger: Logger = make({})
