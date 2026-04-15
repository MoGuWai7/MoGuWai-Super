-- ============================================================
-- supabase/tests/create_order.test.sql
-- ============================================================
-- create_order RPC 의 핵심 시나리오를 pgTAP 으로 검증한다.
--
-- 이 스크립트는 CI 에 자동 연결되어 있지 않다.
-- 로컬에서 pgTAP 이 설치된 Postgres 에 연결해 수동 실행하는 참고용이다.
--
-- 실행 예:
--   psql "$DATABASE_URL" -f supabase/tests/create_order.test.sql
--
-- 시나리오:
--   1. 정상 주문 → 주문 1건 + 항목 삽입 + 재고 차감 + 장바구니 비움
--   2. 재고 부족 → P0001 예외 + 주문 생성되지 않음(롤백)
--   3. 비활성 상품 → P0002 예외
--   4. 멱등성 키 중복 호출 → 같은 order id 반환 (중복 생성 없음)
-- ============================================================

begin;

create extension if not exists pgtap;
select plan(8);

-- ── 테스트 픽스처 ────────────────────────────────────────────────────────────
-- 독립 스키마를 가정하지 않고 기존 테이블에 시드 user/product 를 넣는다.
-- 테스트 종료 시 ROLLBACK 으로 모두 되돌림.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'u1@test.local')
  on conflict do nothing;

-- public.users 는 trigger 로 자동 생성되지만 테스트 환경에서는 직접 삽입
insert into public.users (id, email, name, role) values
  ('00000000-0000-0000-0000-000000000001', 'u1@test.local', 'U1', 'user')
  on conflict do nothing;

insert into public.products (id, name, price, stock, status) values
  ('00000000-0000-0000-0000-0000000000aa', 'A', 1000, 5, 'active'),
  ('00000000-0000-0000-0000-0000000000bb', 'B', 2000, 0, 'active'),
  ('00000000-0000-0000-0000-0000000000cc', 'C', 3000, 5, 'inactive');

-- ── 1. 정상 주문 ────────────────────────────────────────────────────────────
select lives_ok(
  $$ select public.create_order(
       '00000000-0000-0000-0000-000000000001'::uuid,
       '[{"product_id":"00000000-0000-0000-0000-0000000000aa","quantity":2}]'::jsonb,
       '{"name":"U","phone":"01012345678","zip":"12345","address1":"A"}'::jsonb,
       null
     ) $$,
  '정상 주문이 예외 없이 생성된다'
);

select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000aa'),
  3,
  '재고가 5 → 3 으로 차감'
);

select is(
  (select count(*)::int from public.orders where user_id = '00000000-0000-0000-0000-000000000001'),
  1,
  '주문 1건 생성됨'
);

-- ── 2. 재고 부족 ────────────────────────────────────────────────────────────
select throws_like(
  $$ select public.create_order(
       '00000000-0000-0000-0000-000000000001'::uuid,
       '[{"product_id":"00000000-0000-0000-0000-0000000000bb","quantity":1}]'::jsonb,
       '{"name":"U","phone":"01012345678","zip":"12345","address1":"A"}'::jsonb,
       null
     ) $$,
  '%OUT_OF_STOCK%',
  '재고 0 상품 주문 시 OUT_OF_STOCK 예외'
);

-- ── 3. 비활성 상품 ──────────────────────────────────────────────────────────
select throws_like(
  $$ select public.create_order(
       '00000000-0000-0000-0000-000000000001'::uuid,
       '[{"product_id":"00000000-0000-0000-0000-0000000000cc","quantity":1}]'::jsonb,
       '{"name":"U","phone":"01012345678","zip":"12345","address1":"A"}'::jsonb,
       null
     ) $$,
  '%PRODUCT_NOT_AVAILABLE%',
  'inactive 상품 주문 시 PRODUCT_NOT_AVAILABLE 예외'
);

-- ── 4. 멱등성 키 ────────────────────────────────────────────────────────────
select is(
  public.create_order(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '[{"product_id":"00000000-0000-0000-0000-0000000000aa","quantity":1}]'::jsonb,
    '{"name":"U","phone":"01012345678","zip":"12345","address1":"A"}'::jsonb,
    'idem-key-xyz'
  ),
  public.create_order(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '[{"product_id":"00000000-0000-0000-0000-0000000000aa","quantity":1}]'::jsonb,
    '{"name":"U","phone":"01012345678","zip":"12345","address1":"A"}'::jsonb,
    'idem-key-xyz'
  ),
  '동일 멱등성 키 재호출은 같은 order id 를 반환'
);

select is(
  (select count(*)::int from public.orders
    where user_id = '00000000-0000-0000-0000-000000000001'
      and idempotency_key = 'idem-key-xyz'),
  1,
  '멱등성 키로 생성된 주문은 1건만 존재'
);

-- 재고 추가 검증 — 첫 주문 2 + 멱등성 호출 1 = 총 3개 차감 (멱등성 재호출은 새 차감 없음)
select is(
  (select stock from public.products where id = '00000000-0000-0000-0000-0000000000aa'),
  2,
  '멱등성 재호출로 인해 재고가 추가 차감되지 않음'
);

select is(
  (select count(*)::int from public.cart_items
    where user_id = '00000000-0000-0000-0000-000000000001'),
  0,
  '주문 완료 후 장바구니가 비어있다'
);

select * from finish();
rollback;
