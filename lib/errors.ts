export function getErrorMessage(error: unknown, fallback = '오류가 발생했습니다.') {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}
