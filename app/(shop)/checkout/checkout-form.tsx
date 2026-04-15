/**
 * app/(shop)/checkout/checkout-form.tsx  ('use client')
 *
 * 주문하기 폼 컴포넌트.
 *
 * [구성]
 * - 배송 정보 입력 (받는 분 / 연락처 / 우편번호 / 주소)
 * - 주문 상품 요약 + 결제 금액 (우측 고정 패널)
 * - 클라이언트 유효성 검사 (validate 함수) + 인라인 에러 메시지
 *
 * [제출 흐름]
 * 유효성 검사 → POST /api/orders → 성공 시 /orders/complete?id=... 이동
 *
 * [buyNow 모드]
 * props.buyNow 가 있으면 요청 body 에 포함해 API 가 단건 구매 처리를 하도록 한다.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Package, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type CartProduct = {
  id: string
  name: string
  price: number
  stock: number
  thumbnail_url: string | null
}

type CartItemData = {
  id: string
  quantity: number
  products: CartProduct
}

interface CheckoutFormProps {
  cartItems: CartItemData[]
  defaultName: string
  buyNow?: { productId: string; quantity: number }
}

export default function CheckoutForm({ cartItems, defaultName, buyNow }: CheckoutFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: defaultName,
    phone: '',
    zip: '',
    address1: '',
    address2: '',
  })

  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const total = cartItems.reduce(
    (sum, item) => sum + item.products.price * item.quantity,
    0
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    console.log('[CheckoutForm:handleChange] 필드 변경', { field: name, value })
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof typeof form]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function validate() {
    console.log('[CheckoutForm:validate] 유효성 검사 시작', { form })
    const newErrors: Partial<typeof form> = {}
    if (!form.name.trim()) newErrors.name = '받는 분 이름을 입력해주세요.'
    if (!form.phone.trim()) newErrors.phone = '연락처를 입력해주세요.'
    else if (!/^[0-9-]{9,14}$/.test(form.phone.replace(/\s/g, '')))
      newErrors.phone = '올바른 연락처를 입력해주세요.'
    if (!form.zip.trim()) newErrors.zip = '우편번호를 입력해주세요.'
    if (!form.address1.trim()) newErrors.address1 = '주소를 입력해주세요.'
    console.log('[CheckoutForm:validate] 검사 결과', { valid: Object.keys(newErrors).length === 0, errors: newErrors })
    return newErrors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[CheckoutForm:handleSubmit] 주문 제출 시작', { buyNowMode: !!buyNow, itemCount: cartItems.length, total })

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      console.log('[CheckoutForm:handleSubmit] 유효성 검사 실패 — 제출 중단', { errors: validationErrors })
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    const payload = {
      shipping_address: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        zip: form.zip.trim(),
        address1: form.address1.trim(),
        address2: form.address2.trim(),
      },
      ...(buyNow ? { buyNow } : {}),
    }
    console.log('[CheckoutForm:handleSubmit] POST /api/orders 요청', { payload })

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      console.log('[CheckoutForm:handleSubmit] 응답 수신', { status: res.status, ok: res.ok })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? '주문 생성 실패')
      }

      const { orderId } = await res.json()
      console.log('[CheckoutForm:handleSubmit] 주문 생성 성공 — 완료 페이지로 이동', { orderId })
      router.push(`/orders/complete?id=${orderId}`)
      router.refresh()
    } catch (err: any) {
      console.error('[CheckoutForm:handleSubmit] 주문 실패', { message: err.message })
      toast.error(err.message ?? '주문 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 뒤로가기 */}
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500
          hover:text-zinc-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        장바구니로
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 mb-8">주문하기</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 배송지 입력 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h2 className="text-base font-semibold text-zinc-900 mb-5">배송 정보</h2>
              <div className="space-y-4">

                {/* 받는 분 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    받는 분 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="이름을 입력하세요"
                    className={`w-full h-11 px-3.5 rounded-lg border text-sm
                      focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                      transition-colors ${errors.name ? 'border-red-400' : 'border-zinc-200'}`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* 연락처 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="010-0000-0000"
                    className={`w-full h-11 px-3.5 rounded-lg border text-sm
                      focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                      transition-colors ${errors.phone ? 'border-red-400' : 'border-zinc-200'}`}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
                </div>

                {/* 우편번호 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    우편번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    placeholder="12345"
                    maxLength={5}
                    className={`w-32 h-11 px-3.5 rounded-lg border text-sm
                      focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                      transition-colors ${errors.zip ? 'border-red-400' : 'border-zinc-200'}`}
                  />
                  {errors.zip && <p className="mt-1 text-xs text-red-500">{errors.zip}</p>}
                </div>

                {/* 주소 */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address1"
                    value={form.address1}
                    onChange={handleChange}
                    placeholder="기본 주소"
                    className={`w-full h-11 px-3.5 rounded-lg border text-sm mb-2
                      focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                      transition-colors ${errors.address1 ? 'border-red-400' : 'border-zinc-200'}`}
                  />
                  {errors.address1 && (
                    <p className="mb-2 text-xs text-red-500">{errors.address1}</p>
                  )}
                  <input
                    type="text"
                    name="address2"
                    value={form.address2}
                    onChange={handleChange}
                    placeholder="상세 주소 (선택)"
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-200 text-sm
                      focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent
                      transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">

              {/* 상품 목록 */}
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100">
                  <h2 className="text-sm font-semibold text-zinc-900">
                    주문 상품 <span className="text-zinc-400 font-normal">{cartItems.length}개</span>
                  </h2>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {cartItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-12 h-12 rounded-lg bg-zinc-100 shrink-0 overflow-hidden">
                        {item.products.thumbnail_url ? (
                          <Image
                            src={item.products.thumbnail_url}
                            alt={item.products.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-zinc-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {item.products.name}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {item.products.price.toLocaleString('ko-KR')}원 × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 whitespace-nowrap">
                        {(item.products.price * item.quantity).toLocaleString('ko-KR')}원
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 결제 금액 */}
              <div className="bg-white rounded-xl border border-zinc-200 p-4">
                <h2 className="text-sm font-semibold text-zinc-900 mb-3">결제 금액</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-600">
                    <span>상품 금액</span>
                    <span>{total.toLocaleString('ko-KR')}원</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>배송비</span>
                    <span className="text-emerald-600 font-medium">무료</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-900 pt-2 border-t border-zinc-100">
                    <span>총 결제금액</span>
                    <span className="text-lg">{total.toLocaleString('ko-KR')}원</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 h-11 rounded-lg bg-zinc-900 text-white text-sm
                    font-medium hover:bg-zinc-700 transition-colors disabled:opacity-60
                    disabled:cursor-not-allowed"
                >
                  {loading ? '주문 처리 중...' : `${total.toLocaleString('ko-KR')}원 주문하기`}
                </button>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
