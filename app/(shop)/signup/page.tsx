/**
 * app/(shop)/signup/page.tsx
 *
 * 회원가입 페이지 (/signup).
 * 이름·이메일·비밀번호 입력 → Supabase Auth signUp → users 테이블 insert 순으로 처리.
 * Client Component — 폼 유효성 검사와 비밀번호 표시/숨김 토글이 필요하다.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

function validate(name: string, email: string, password: string, confirmPassword: string): FormErrors {
  const errors: FormErrors = {}

  if (!name.trim()) {
    errors.name = '이름을 입력해주세요.'
  } else if (name.trim().length < 2) {
    errors.name = '이름은 2자 이상이어야 합니다.'
  }

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

  if (!confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해주세요.'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.'
  }

  return errors
}

type PageState = 'form' | 'success'

export default function SignupPage() {
  const [pageState, setPageState] = useState<PageState>('form')
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  function clearFieldError(field: keyof FormErrors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[SignupPage:handleSubmit] 회원가입 폼 제출', { email, name })

    const validationErrors = validate(name, email, password, confirmPassword)
    if (Object.keys(validationErrors).length > 0) {
      console.log('[SignupPage:handleSubmit] 클라이언트 유효성 검사 실패', { errors: validationErrors })
      setErrors(validationErrors)
      return
    }

    console.log('[SignupPage:handleSubmit] 유효성 검사 통과 — Supabase signUp 호출')
    setErrors({})
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim() },
        },
      })

      console.log('[SignupPage:handleSubmit] signUp 응답', {
        hasError: !!error,
        userId: data?.user?.id,
        emailConfirmed: !!data?.user?.email_confirmed_at,
        errorMessage: error?.message,
      })

      if (error) {
        console.error('[SignupPage:handleSubmit] signUp 오류', { message: error.message, status: error.status })
        if (error.message.includes('User already registered')) {
          setErrors({ email: '이미 가입된 이메일 주소입니다.' })
        } else if (error.message.toLowerCase().includes('password') && error.message.toLowerCase().includes('characters')) {
          // Supabase 서버 최소 비밀번호 길이 오류 (기본 6자, Dashboard > Authentication > Sign In/Up > Password Settings에서 조정)
          setErrors({ password: '비밀번호는 최소 6자 이상이어야 합니다.' })
        } else {
          setErrors({ general: error.message || '회원가입 중 오류가 발생했습니다.' })
        }
        return
      }

      // 이메일 인증 없이 즉시 로그인 시도
      // Supabase Dashboard에서 "Enable email confirmations"를 OFF로 설정하면 바로 성공
      console.log('[SignupPage:handleSubmit] 즉시 로그인 시도 (이메일 인증 우회)', { email })
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      console.log('[SignupPage:handleSubmit] 즉시 로그인 결과', {
        success: !signInError,
        errorMessage: signInError?.message,
      })

      if (!signInError) {
        console.log('[SignupPage:handleSubmit] 가입 및 즉시 로그인 성공 — 홈으로 이동')
        router.push('/')
        router.refresh()
      } else {
        // 이메일 인증이 아직 활성화된 경우 — 안내 화면
        console.log('[SignupPage:handleSubmit] 즉시 로그인 불가 — 이메일 인증 안내 표시', { reason: signInError.message })
        setPageState('success')
      }
    } catch (err) {
      console.error('[SignupPage:handleSubmit] 예외 발생', { err })
      setErrors({ general: '네트워크 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  // 이메일 인증 안내 화면
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 bg-zinc-100 rounded-full mx-auto mb-5">
              <ShoppingBag className="w-7 h-7 text-zinc-700" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">가입이 완료되었습니다</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              <span className="font-medium text-zinc-700">{email}</span>로<br />
              인증 메일을 발송했습니다.
              <br />
              메일함의 링크를 클릭한 후 로그인해주세요.
            </p>
            <p className="mt-6 text-sm text-zinc-500">
              인증 완료 후{' '}
              <Link href="/login" className="font-medium text-zinc-900 hover:underline underline-offset-4">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
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
          <p className="mt-1 text-sm text-zinc-500">새 계정을 만들어보세요</p>
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

            {/* 이름 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                이름
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => { setName(e.target.value); clearFieldError('name') }}
                placeholder="홍길동"
                className={`w-full h-11 px-3.5 rounded-lg border text-sm text-zinc-900 placeholder:text-zinc-400
                  bg-white transition-colors outline-none
                  focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                  ${errors.name ? 'border-red-400 bg-red-50' : 'border-zinc-300 hover:border-zinc-400'}`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

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
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
                  placeholder="6자 이상 입력"
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

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 mb-1.5">
                비밀번호 확인
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }}
                  placeholder="비밀번호 재입력"
                  className={`w-full h-11 pl-3.5 pr-10 rounded-lg border text-sm text-zinc-900 placeholder:text-zinc-400
                    bg-white transition-colors outline-none
                    focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                    ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-zinc-300 hover:border-zinc-400'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-400
                text-white text-sm font-medium rounded-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
            >
              {loading ? '처리 중...' : '회원가입'}
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

          {/* 로그인 링크 */}
          <p className="text-center text-sm text-zinc-500">
            이미 계정이 있으신가요?{' '}
            <Link
              href="/login"
              className="font-medium text-zinc-900 hover:underline underline-offset-4"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
