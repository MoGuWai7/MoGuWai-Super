-- ============================================================
-- MoGuWai Super - Database Schema
-- ============================================================
-- 실행 순서: 이 파일을 Supabase SQL Editor에 전체 붙여넣고 실행
-- 순서: Extensions → Tables → Functions → Triggers → RLS → Storage
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- 1. TABLES
-- ============================================================

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  name       text not null default '',
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.users is '서비스 회원 프로필 (auth.users 확장)';


-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
create table public.categories (
  id   uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique
);

comment on table public.categories is '상품 카테고리';


-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
create table public.products (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text not null default '',
  price         integer not null check (price >= 0),
  stock         integer not null default 0 check (stock >= 0),
  category_id   uuid references public.categories(id) on delete set null,
  thumbnail_url text,
  images        text[] not null default '{}',
  status        text not null default 'active' check (status in ('active', 'inactive', 'deleted')),
  created_at    timestamptz not null default now()
);

comment on table public.products is '판매 상품';
comment on column public.products.price  is '판매가 (원)';
comment on column public.products.images is 'Storage URL 배열';

create index idx_products_category   on public.products(category_id);
create index idx_products_status     on public.products(status);
create index idx_products_created_at on public.products(created_at desc);


-- ------------------------------------------------------------
-- cart_items
-- ------------------------------------------------------------
create table public.cart_items (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

comment on table public.cart_items is '장바구니';

create index idx_cart_items_user on public.cart_items(user_id);


-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
create table public.orders (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete restrict,
  status           text not null default 'pending'
                     check (status in (
                       'pending',
                       'payment_confirmed',
                       'preparing',
                       'shipping',
                       'delivered',
                       'cancelled'
                     )),
  total_price      integer not null check (total_price >= 0),
  shipping_address jsonb not null default '{}',
  -- 멱등성 키: 동일 (user_id, idempotency_key) 중복 요청 차단
  -- 네트워크 재시도·더블클릭으로 인한 주문 중복 생성을 DB 레벨에서 방지한다
  idempotency_key  text,
  created_at       timestamptz not null default now()
);

comment on table public.orders is '주문';
comment on column public.orders.status           is 'pending→payment_confirmed→preparing→shipping→delivered / cancelled';
comment on column public.orders.shipping_address is '{ name, phone, zip, address1, address2 }';
comment on column public.orders.idempotency_key  is '주문 생성 요청 멱등성 키 (user_id와 조합하여 유일)';

create index idx_orders_user       on public.orders(user_id);
create index idx_orders_status     on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);

-- (user_id, idempotency_key) UNIQUE — 같은 키로 두 번 호출되면 두 번째는 충돌
create unique index idx_orders_idempotency
  on public.orders(user_id, idempotency_key)
  where idempotency_key is not null;


-- ------------------------------------------------------------
-- admin_audit_logs
-- ------------------------------------------------------------
-- 관리자의 쓰기 작업(주문 상태 변경, 상품 수정/삭제 등)을 감사 로그로 기록한다.
-- - actor_id     : 작업 수행 관리자
-- - action       : 'order.status_change' | 'product.update' | 'product.delete' ...
-- - target_type  : 'order' | 'product' | 'category'
-- - target_id    : 작업 대상 리소스 id
-- - diff         : { before?: {...}, after?: {...} } 형태로 변경 스냅샷 저장
-- 관리자 본인 확인 후 페이지에서 최근 활동을 조회하는 용도로도 사용된다.
create table public.admin_audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid not null references public.users(id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  diff        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

comment on table public.admin_audit_logs is '관리자 작업 감사 로그';

create index idx_admin_audit_actor      on public.admin_audit_logs(actor_id);
create index idx_admin_audit_target     on public.admin_audit_logs(target_type, target_id);
create index idx_admin_audit_created_at on public.admin_audit_logs(created_at desc);


-- ------------------------------------------------------------
-- order_items
-- ------------------------------------------------------------
create table public.order_items (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  quantity       integer not null check (quantity >= 1),
  price_at_order integer not null check (price_at_order >= 0)
);

comment on table public.order_items is '주문 상세 항목';
comment on column public.order_items.price_at_order is '주문 당시 가격 스냅샷 (원)';

create index idx_order_items_order   on public.order_items(order_id);
create index idx_order_items_product on public.order_items(product_id);


-- ============================================================
-- 2. FUNCTIONS
-- ============================================================

-- 관리자 여부 확인 (public.users 테이블 생성 이후에 정의)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- auth.users 회원가입 시 public.users 행 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;


-- ------------------------------------------------------------
-- create_order(RPC)
-- ------------------------------------------------------------
-- 주문 생성을 단일 트랜잭션으로 원자화한다.
--
-- [왜 RPC인가]
-- API Route에서 여러 supabase-js 호출로 orders/order_items/products를 나눠 처리하면
-- (1) 각 쿼리마다 왕복 비용이 들고,
-- (2) 부분 실패 시 수동 롤백이 필요하며,
-- (3) 동시에 같은 상품을 주문하는 두 요청에서 재고 검증과 차감 사이에 race condition이 발생한다.
-- 이를 하나의 PL/pgSQL 함수로 묶어 BEGIN/COMMIT 범위 안에서
-- SELECT ... FOR UPDATE 로 상품 행을 락하면 위 세 문제를 동시에 해결할 수 있다.
--
-- [입력]
--   p_user_id         : 주문 소유자
--   p_items           : [{ product_id: uuid, quantity: int }, ...]
--   p_shipping_address: 배송지 JSONB
--   p_idempotency_key : 멱등성 키 (null 허용, 있으면 UNIQUE 인덱스로 중복 차단)
--
-- [반환] 생성된 주문의 id
--
-- [예외]
--   P0001 OUT_OF_STOCK          — 재고 부족
--   P0002 PRODUCT_NOT_AVAILABLE — 판매중이 아님
--   23505                       — 동일 멱등성 키로 이미 주문 존재 (UNIQUE 위반)
create or replace function public.create_order(
  p_user_id          uuid,
  p_items            jsonb,
  p_shipping_address jsonb,
  p_idempotency_key  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id   uuid;
  v_total      integer := 0;
  v_item       jsonb;
  v_product_id uuid;
  v_quantity   integer;
  v_product    record;
  v_existing   uuid;
begin
  -- 0) 멱등성 키가 있으면 기존 주문을 먼저 찾아본다
  --    (UNIQUE 위반 예외에 의존하지 않고 선조회해 명시적으로 기존 id 반환)
  if p_idempotency_key is not null then
    select id into v_existing
      from public.orders
     where user_id = p_user_id
       and idempotency_key = p_idempotency_key
     limit 1;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- 1) 상품 락 + 재고/상태 검증 + 총액 계산
  --    FOR UPDATE 로 각 상품 행을 트랜잭션 종료시까지 락해
  --    동시에 진행중인 다른 주문이 같은 상품을 읽는 것을 막는다
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := (v_item->>'quantity')::int;

    if v_quantity < 1 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0003';
    end if;

    select id, name, price, stock, status
      into v_product
      from public.products
     where id = v_product_id
       for update;

    if not found or v_product.status <> 'active' then
      raise exception 'PRODUCT_NOT_AVAILABLE: %', v_product_id
        using errcode = 'P0002';
    end if;

    if v_product.stock < v_quantity then
      raise exception 'OUT_OF_STOCK: % (남은 재고 %)', v_product.name, v_product.stock
        using errcode = 'P0001';
    end if;

    v_total := v_total + v_product.price * v_quantity;
  end loop;

  -- 2) 주문 헤더 생성
  insert into public.orders (user_id, status, total_price, shipping_address, idempotency_key)
  values (p_user_id, 'pending', v_total, p_shipping_address, p_idempotency_key)
  returning id into v_order_id;

  -- 3) 주문 항목 insert + 재고 차감 (다시 루프)
  --    위에서 이미 행을 락했으므로 여기서 UPDATE는 안전하다
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := (v_item->>'quantity')::int;

    select price into v_product.price
      from public.products
     where id = v_product_id;

    insert into public.order_items (order_id, product_id, quantity, price_at_order)
    values (v_order_id, v_product_id, v_quantity, v_product.price);

    update public.products
       set stock = stock - v_quantity
     where id = v_product_id;
  end loop;

  -- 4) 해당 사용자의 장바구니 비우기 (바로 구매든 장바구니 구매든 일관되게 청소)
  --    바로구매는 장바구니에 원래 없었을 가능성이 높으므로 no-op일 수도 있다
  delete from public.cart_items where user_id = p_user_id;

  return v_order_id;
end;
$$;

comment on function public.create_order is
  '주문 생성을 단일 트랜잭션으로 원자화한다. 재고 락(FOR UPDATE) + 멱등성 키 지원.';


-- ------------------------------------------------------------
-- log_admin_action(RPC)
-- ------------------------------------------------------------
-- 관리자 작업을 감사 로그에 기록하는 헬퍼.
-- API Route에서 SERVICE_ROLE 키로 호출하되 actor_id는 세션에서 전달받아 저장한다.
create or replace function public.log_admin_action(
  p_actor_id    uuid,
  p_action      text,
  p_target_type text,
  p_target_id   uuid,
  p_diff        jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.admin_audit_logs (actor_id, action, target_type, target_id, diff)
  values (p_actor_id, p_action, p_target_type, p_target_id, p_diff);
$$;


-- ============================================================
-- 3. TRIGGERS
-- ============================================================

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.users             enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.cart_items        enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.admin_audit_logs  enable row level security;


-- ------------------------------------------------------------
-- users 정책
-- ------------------------------------------------------------

create policy "users: 본인/관리자 조회"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

-- 본인 수정 — role 컬럼은 변경 불가
create policy "users: 본인 수정"
  on public.users for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.users where id = auth.uid())
  );

-- 관리자 수정 — role 변경 포함
create policy "users: 관리자 수정"
  on public.users for update
  using (public.is_admin());


-- ------------------------------------------------------------
-- categories 정책
-- ------------------------------------------------------------

create policy "categories: 전체 조회"
  on public.categories for select
  using (true);

create policy "categories: 관리자 삽입"
  on public.categories for insert
  with check (public.is_admin());

create policy "categories: 관리자 수정"
  on public.categories for update
  using (public.is_admin());

create policy "categories: 관리자 삭제"
  on public.categories for delete
  using (public.is_admin());


-- ------------------------------------------------------------
-- products 정책
-- ------------------------------------------------------------

-- active 상품은 비회원 포함 전체 조회, 나머지는 관리자만
create policy "products: 활성 상품 전체 조회"
  on public.products for select
  using (status = 'active' or public.is_admin());

create policy "products: 관리자 삽입"
  on public.products for insert
  with check (public.is_admin());

create policy "products: 관리자 수정"
  on public.products for update
  using (public.is_admin());

create policy "products: 관리자 삭제"
  on public.products for delete
  using (public.is_admin());


-- ------------------------------------------------------------
-- cart_items 정책
-- ------------------------------------------------------------

create policy "cart_items: 본인 조회"
  on public.cart_items for select
  using (auth.uid() = user_id);

create policy "cart_items: 본인 삽입"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "cart_items: 본인 수정"
  on public.cart_items for update
  using (auth.uid() = user_id);

create policy "cart_items: 본인 삭제"
  on public.cart_items for delete
  using (auth.uid() = user_id);


-- ------------------------------------------------------------
-- orders 정책
-- ------------------------------------------------------------

create policy "orders: 본인/관리자 조회"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "orders: 본인 주문 생성"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- 상태 변경은 관리자만 (취소 포함)
create policy "orders: 관리자 수정"
  on public.orders for update
  using (public.is_admin());


-- ------------------------------------------------------------
-- order_items 정책
-- ------------------------------------------------------------

create policy "order_items: 본인/관리자 조회"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where id = order_items.order_id
        and (user_id = auth.uid() or public.is_admin())
    )
  );

-- 주문 생성 시 함께 삽입 (주문 소유자만)
create policy "order_items: 본인 삽입"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where id = order_items.order_id
        and user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- admin_audit_logs 정책
-- ------------------------------------------------------------

-- 관리자만 조회 (insert는 RPC/service_role로만 이루어짐)
create policy "admin_audit_logs: 관리자 조회"
  on public.admin_audit_logs for select
  using (public.is_admin());


-- ============================================================
-- 4-1. RPC 실행 권한 — authenticated 사용자에게만 부여
-- ============================================================

-- create_order 는 로그인 사용자만 호출 가능
revoke all on function public.create_order(uuid, jsonb, jsonb, text) from public;
grant execute on function public.create_order(uuid, jsonb, jsonb, text) to authenticated;

-- log_admin_action 은 service_role 키(API Route)에서만 호출하도록 public 취소
revoke all on function public.log_admin_action(uuid, text, text, uuid, jsonb) from public;
-- service_role 은 모든 함수에 기본 실행 권한이 있음 (별도 grant 불필요)


-- ============================================================
-- 5. STORAGE
-- ============================================================

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "storage products: 전체 읽기"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "storage products: 관리자 업로드"
  on storage.objects for insert
  with check (bucket_id = 'products' and public.is_admin());

create policy "storage products: 관리자 삭제"
  on storage.objects for delete
  using (bucket_id = 'products' and public.is_admin());
