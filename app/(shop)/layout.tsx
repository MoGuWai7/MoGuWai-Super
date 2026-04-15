/**
 * app/(shop)/layout.tsx
 *
 * 쇼핑몰 공통 레이아웃 (Route Group: (shop)).
 *
 * [역할]
 * Header + main 영역 + Footer 를 감싸는 쉘.
 * (shop) 그룹 하위의 모든 페이지 (홈, 상품, 장바구니, 주문, 마이페이지)에 적용된다.
 *
 * [admin 그룹과의 차이]
 * admin 그룹은 별도의 사이드바 레이아웃(app/admin/layout.tsx)을 사용한다.
 */

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
