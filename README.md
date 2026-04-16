# MoGuWai Super

풀스택 쇼핑몰 포트폴리오 프로젝트입니다.

**고객은** 상품을 둘러보고, 장바구니에 담거나 바로 구매할 수 있습니다.
주문 후에는 마이페이지에서 배송 상태를 확인하고, 필요하면 취소도 할 수 있습니다.

**관리자는** 별도 대시보드에서 상품·카테고리·주문·회원을 한곳에서 관리합니다.
매출과 주문 현황은 차트로 한눈에 파악할 수 있습니다.

**배포 주소**: https://moguwai-super.vercel.app

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 화면 구성

### 쇼핑몰

| 페이지 | 주소 | 설명 |
|--------|------|------|
| 홈 | `/` | 신상품 · 인기 상품 소개 |
| 상품 목록 | `/products` | 검색 · 카테고리 · 가격순 정렬 |
| 상품 상세 | `/products/[slug]` | 이미지 갤러리, 수량 선택, 장바구니 담기 / 바로 구매 |
| 장바구니 | `/cart` | 수량 변경, 항목 삭제, 금액 계산 |
| 주문서 | `/checkout` | 배송지 입력, 주문 확인 |
| 주문 완료 | `/orders/complete` | 주문 접수 확인 |
| 마이페이지 | `/mypage` | 주문 내역, 주문 상세, 주문 취소 |
| 회원가입 | `/signup` | 이름 · 이메일 · 비밀번호 |
| 로그인 | `/login` | 이메일 · 비밀번호 |

### 관리자 (어드민)

| 페이지 | 주소 | 설명 |
|--------|------|------|
| 대시보드 | `/admin` | 매출 · 주문 · 상품 · 회원 통계, 매출 차트 |
| 주문 관리 | `/admin/orders` | 주문 목록, 상태 변경 |
| 상품 관리 | `/admin/products` | 상품 등록 · 수정 · 삭제 (slug URL 지원) |
| 카테고리 관리 | `/admin/categories` | 카테고리 추가 · 수정 · 삭제 |
| 회원 관리 | `/admin/users` | 회원 목록 조회 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router), TypeScript |
| 스타일 | Tailwind CSS v4 |
| 백엔드 / DB | Supabase (PostgreSQL, Auth, Storage) |
| 유효성 검사 | Zod |
| 차트 | Recharts |
| 배포 | Vercel |

---

## 로컬 실행

```bash
# 패키지 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# 아래 항목 입력 후 저장

# 개발 서버 실행
npm run dev
```

### 환경변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 공개 키 |

---

## License

MIT License © 2026 [MoGuWai](https://github.com/moguwai7)

코드 참고는 자유롭게 하되, 그대로 복사해 배포하는 것은 삼가주세요.
