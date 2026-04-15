/**
 * app/(shop)/login/page.tsx  ('use client')
 *
 * 로그인 페이지 (/login).
 *
 * [기능]
 * - 이메일 / 비밀번호 입력 + 클라이언트 유효성 검사
 * - Supabase signInWithPassword 호출
 * - 에러 코드별 한국어 메시지 분기 (Invalid credentials / Email not confirmed)
 * - 로그인 성공 시 ?redirect= 쿼리 경로로 복귀 (없으면 홈)
 */

'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {}
  if (!email) {
    errors.email = '이메일을 입력해주세요.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '올바른 이메일 형식이 아닙니다.'
  }
  if (!password) {
    errors.password = '비밀번호를 입력해주세요.'
  } else if (password.length < 6) {
    errors.password = '비밀번호는 6자 이상이어야 합니다.'
  }
  return errors
}

// Next.js 16 은 useSearchParams() 를 사용하는 클라이언트 페이지를
// 반드시 Suspense boundary 로 감싸야 빌드 타임 prerender 가 성공한다.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[LoginForm:handleSubmit] 로그인 폼 제출', { email, redirectTo })

    const validationErrors = validate(email, password)
    if (Object.keys(validationErrors).length > 0) {
      console.log('[LoginForm:handleSubmit] 클라이언트 유효성 검사 실패', { errors: validationErrors })
      setErrors(validationErrors)
      return
    }

    console.log('[LoginForm:handleSubmit] 유효성 검사 통과 — Supabase signInWithPassword 호출')
    setErrors({})
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      console.log('[LoginForm:handleSubmit] signInWithPassword 응답', {
        hasError: !!error,
        userId: data?.user?.id,
        errorMessage: error?.message,
      })

      if (error) {
        console.error('[LoginForm:handleSubmit] 로그인 오류', { message: error.message, status: error.status })
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: '이메일 또는 비밀번호가 올바르지 않습니다.' })
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: '이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.' })
        } else {
          setErrors({ general: error.message || '로그인 중 오류가 발생했습니다.' })
        }
        return
      }

      console.log('[LoginForm:handleSubmit] 로그인 성공 — 이동', { redirectTo, userId: data?.user?.id })
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      console.error('[LoginForm:handleSubmit] 예외 발생', { err })
      setErrors({ general: '네트워크 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-zinc-900 rounded-xl mb-4">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">MoGuWai Super</h1>
          <p className="mt-1 text-sm text-zinc-500">계정에 로그인하세요</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8">

          {/* 전역 에러 */}
          {errors.general && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                placeholder="you@example.com"
                className={`w-full h-11 px-3.5 rounded-lg border text-sm text-zinc-900 placeholder:text-zinc-400
                  bg-white transition-colors outline-none
                  focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-zinc-300 hover:border-zinc-400'}`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  placeholder="비밀번호 입력"
                  className={`w-full h-11 pl-3.5 pr-10 rounded-lg border text-sm text-zinc-900 placeholder:text-zinc-400
                    bg-white transition-colors outline-none
                    focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                    ${errors.password ? 'border-red-400 bg-red-50' : 'border-zinc-300 hover:border-zinc-400'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-400
                text-white text-sm font-medium rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-zinc-400">또는</span>
            </div>
          </div>

          {/* 회원가입 링크 */}
          <p className="text-center text-sm text-zinc-500">
            아직 계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="font-medium text-zinc-900 hover:underline underline-offset-4"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
