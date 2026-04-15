-- ============================================================
-- MoGuWai Super - Seed Data
-- Supabase SQL Editor에서 실행
-- ※ 중복 방지 처리 포함 (재실행 안전)
-- ※ 테스트 주문은 users 테이블에 최소 1명이 있어야 생성됨
-- ============================================================


-- ============================================================
-- 1. CATEGORIES (ON CONFLICT 처리)
-- ============================================================

INSERT INTO public.categories (name, slug) VALUES
  ('의류',     'clothing'),
  ('전자기기', 'electronics'),
  ('생활용품', 'living'),
  ('스포츠',   'sports'),
  ('과일',     'fruits'),
  ('식품',     'food')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;


-- ============================================================
-- 2. PRODUCTS (동일 이름 상품이 없을 때만 삽입)
-- ============================================================

-- 의류
INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '기본 화이트 티셔츠',
       '부드러운 코튼 소재의 기본 티셔츠입니다. 365일 어디에나 잘 어울리는 베이직 아이템.',
       29000, 100, id,
       'https://picsum.photos/seed/tshirt1/400/400',
       ARRAY['https://picsum.photos/seed/tshirt1/400/400'], 'active'
FROM public.categories WHERE slug = 'clothing'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '기본 화이트 티셔츠');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '슬림핏 청바지',
       '깔끔한 실루엣의 슬림핏 청바지입니다. 면 90% 혼방으로 편안한 착용감을 제공합니다.',
       59000, 80, id,
       'https://picsum.photos/seed/jeans1/400/400',
       ARRAY['https://picsum.photos/seed/jeans1/400/400'], 'active'
FROM public.categories WHERE slug = 'clothing'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '슬림핏 청바지');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '오버핏 후드 집업',
       '넉넉한 오버핏 핏의 후드 집업입니다. 폴리에스터 플리스 소재로 따뜻하고 가볍습니다.',
       79000, 60, id,
       'https://picsum.photos/seed/hoodie1/400/400',
       ARRAY['https://picsum.photos/seed/hoodie1/400/400'], 'active'
FROM public.categories WHERE slug = 'clothing'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '오버핏 후드 집업');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '울 블렌드 코트',
       '울 40% 폴리 60% 혼방의 클래식 코트입니다. 시즌리스 핏으로 오래 입을 수 있는 아이템.',
       189000, 30, id,
       'https://picsum.photos/seed/coat1/400/400',
       ARRAY['https://picsum.photos/seed/coat1/400/400'], 'active'
FROM public.categories WHERE slug = 'clothing'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '울 블렌드 코트');

-- 전자기기
INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '노이즈캔슬링 무선 이어폰',
       '하이브리드 액티브 노이즈캔슬링 기술 탑재. 최대 30시간 재생, IPX4 방수 등급.',
       89000, 50, id,
       'https://picsum.photos/seed/earphones1/400/400',
       ARRAY['https://picsum.photos/seed/earphones1/400/400'], 'active'
FROM public.categories WHERE slug = 'electronics'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '노이즈캔슬링 무선 이어폰');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '스마트워치 프로',
       '심박수·혈중 산소 측정, GPS, 수면 트래킹. 5ATM 방수, AMOLED 디스플레이.',
       249000, 40, id,
       'https://picsum.photos/seed/smartwatch1/400/400',
       ARRAY['https://picsum.photos/seed/smartwatch1/400/400'], 'active'
FROM public.categories WHERE slug = 'electronics'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '스마트워치 프로');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '보조배터리 20000mAh',
       '고용량 20000mAh, PD 45W 고속 충전 지원. 노트북·태블릿도 충전 가능.',
       45000, 70, id,
       'https://picsum.photos/seed/battery1/400/400',
       ARRAY['https://picsum.photos/seed/battery1/400/400'], 'active'
FROM public.categories WHERE slug = 'electronics'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '보조배터리 20000mAh');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '포터블 블루투스 스피커',
       'IP67 완전 방수, 360° 사운드, 최대 24시간 재생. 캠핑·야외 활동에 최적.',
       69000, 45, id,
       'https://picsum.photos/seed/speaker1/400/400',
       ARRAY['https://picsum.photos/seed/speaker1/400/400'], 'active'
FROM public.categories WHERE slug = 'electronics'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '포터블 블루투스 스피커');

-- 생활용품
INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '아로마 디퓨저 세트',
       '초음파 방식 아로마 디퓨저 + 에센셜 오일 3종 세트. 7색 LED, 자동 꺼짐 기능.',
       39000, 60, id,
       'https://picsum.photos/seed/diffuser1/400/400',
       ARRAY['https://picsum.photos/seed/diffuser1/400/400'], 'active'
FROM public.categories WHERE slug = 'living'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '아로마 디퓨저 세트');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '스테인리스 보온 텀블러',
       '18/8 스테인리스 이중 진공 구조. 12시간 보온·보냉. 500ml, BPA 프리.',
       28000, 90, id,
       'https://picsum.photos/seed/tumbler1/400/400',
       ARRAY['https://picsum.photos/seed/tumbler1/400/400'], 'active'
FROM public.categories WHERE slug = 'living'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '스테인리스 보온 텀블러');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '대나무 수납 바스켓 3종 세트',
       '천연 대나무 소재의 친환경 수납 바스켓 S·M·L 3종 세트. 주방·욕실·거실 다용도.',
       24000, 50, id,
       'https://picsum.photos/seed/basket1/400/400',
       ARRAY['https://picsum.photos/seed/basket1/400/400'], 'active'
FROM public.categories WHERE slug = 'living'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '대나무 수납 바스켓 3종 세트');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '소이 캔들 2개 세트',
       '100% 천연 소이 왁스 캔들. 라벤더 & 바닐라 향 2종 세트. 연소 시간 약 40시간.',
       32000, 40, id,
       'https://picsum.photos/seed/candle1/400/400',
       ARRAY['https://picsum.photos/seed/candle1/400/400'], 'active'
FROM public.categories WHERE slug = 'living'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '소이 캔들 2개 세트');

-- 스포츠
INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT 'TPE 요가매트 6mm',
       '친환경 TPE 소재, 6mm 두께로 무릎·손목 보호. 논슬립 표면, 양면 사용 가능.',
       35000, 80, id,
       'https://picsum.photos/seed/yogamat1/400/400',
       ARRAY['https://picsum.photos/seed/yogamat1/400/400'], 'active'
FROM public.categories WHERE slug = 'sports'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'TPE 요가매트 6mm');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '조절형 덤벨 세트 10kg',
       '2.5kg~10kg 무게 조절 가능한 원터치 덤벨 2개 세트. 컴팩트한 디자인.',
       55000, 30, id,
       'https://picsum.photos/seed/dumbbell1/400/400',
       ARRAY['https://picsum.photos/seed/dumbbell1/400/400'], 'active'
FROM public.categories WHERE slug = 'sports'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '조절형 덤벨 세트 10kg');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '경량 러닝화',
       '초경량 250g, 에어쿠션 미드솔. 통기성 메쉬 갑피, 반사 디테일. 남녀 공용.',
       89000, 50, id,
       'https://picsum.photos/seed/shoes1/400/400',
       ARRAY['https://picsum.photos/seed/shoes1/400/400'], 'active'
FROM public.categories WHERE slug = 'sports'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '경량 러닝화');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '알루미늄 배드민턴 라켓 2개 세트',
       '6061 알루미늄 샤프트, 가벼운 86g. 입문자~중급자 추천. 셔틀콕 3개 포함.',
       42000, 40, id,
       'https://picsum.photos/seed/badminton1/400/400',
       ARRAY['https://picsum.photos/seed/badminton1/400/400'], 'active'
FROM public.categories WHERE slug = 'sports'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '알루미늄 배드민턴 라켓 2개 세트');

-- 과일
INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '제주 감귤 3kg',
       '제주도 직배송 햇감귤. 당도 12브릭스 이상 보장. 농약 잔류 검사 완료.',
       19000, 200, id,
       'https://picsum.photos/seed/tangerine1/400/400',
       ARRAY['https://picsum.photos/seed/tangerine1/400/400'], 'active'
FROM public.categories WHERE slug = 'fruits'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '제주 감귤 3kg');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '국산 청포도 2kg',
       '샤인머스켓 계열 국산 청포도. 씨 없음, 껍질째 먹는 품종. 산지 직송.',
       24000, 150, id,
       'https://picsum.photos/seed/grapes1/400/400',
       ARRAY['https://picsum.photos/seed/grapes1/400/400'], 'active'
FROM public.categories WHERE slug = 'fruits'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '국산 청포도 2kg');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '수박 1통 (8kg 내외)',
       '충남 수박. 당도계 측정 11브릭스 이상만 선별. 익일 새벽 배송.',
       29000, 100, id,
       'https://picsum.photos/seed/watermelon1/400/400',
       ARRAY['https://picsum.photos/seed/watermelon1/400/400'], 'active'
FROM public.categories WHERE slug = 'fruits'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '수박 1통 (8kg 내외)');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '논산 딸기 1kg',
       '충남 논산 설향 딸기. 과육이 단단하고 향이 진합니다. 냉장 보냉 포장 배송.',
       22000, 120, id,
       'https://picsum.photos/seed/strawberry1/400/400',
       ARRAY['https://picsum.photos/seed/strawberry1/400/400'], 'active'
FROM public.categories WHERE slug = 'fruits'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '논산 딸기 1kg');

-- 식품
INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '유기농 오트밀 500g',
       'USDA 유기농 인증 귀리. 글루텐 프리 공정, 빠른 조리 가능한 롤드 오트.',
       12000, 300, id,
       'https://picsum.photos/seed/oatmeal1/400/400',
       ARRAY['https://picsum.photos/seed/oatmeal1/400/400'], 'active'
FROM public.categories WHERE slug = 'food'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '유기농 오트밀 500g');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '아몬드 에너지바 12개입',
       '아몬드·귀리·꿀로 만든 에너지바. 인공감미료 무첨가, 1개당 180kcal. 12개입.',
       18000, 200, id,
       'https://picsum.photos/seed/almonbar1/400/400',
       ARRAY['https://picsum.photos/seed/almonbar1/400/400'], 'active'
FROM public.categories WHERE slug = 'food'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '아몬드 에너지바 12개입');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '엑스트라버진 코코넛오일 500ml',
       '냉압착 엑스트라버진 코코넛오일. 무정제·무표백. 요리·피부 모두 사용 가능.',
       22000, 150, id,
       'https://picsum.photos/seed/coconut1/400/400',
       ARRAY['https://picsum.photos/seed/coconut1/400/400'], 'active'
FROM public.categories WHERE slug = 'food'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '엑스트라버진 코코넛오일 500ml');

INSERT INTO public.products (name, description, price, stock, category_id, thumbnail_url, images, status)
SELECT '그래놀라 400g',
       '통귀리·아몬드·건포도로 만든 홈메이드 스타일 그래놀라. 설탕 최소화, 오트 함량 50%.',
       15000, 180, id,
       'https://picsum.photos/seed/granola1/400/400',
       ARRAY['https://picsum.photos/seed/granola1/400/400'], 'active'
FROM public.categories WHERE slug = 'food'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = '그래놀라 400g');


-- ============================================================
-- 3. TEST ORDERS (users 테이블에 데이터가 있어야 실행됨)
--    ※ 재실행 시 주문이 중복 생성될 수 있음
--    ※ 처음 1회만 실행 권장
-- ============================================================

DO $$
DECLARE
  v_user   uuid;
  v_order  uuid;
  v_p1 uuid; v_price1 int;
  v_p2 uuid; v_price2 int;
  v_p3 uuid; v_price3 int;
  v_p4 uuid; v_price4 int;
  v_p5 uuid; v_price5 int;
  v_p6 uuid; v_price6 int;
BEGIN
  SELECT id INTO v_user FROM public.users ORDER BY created_at LIMIT 1;
  IF v_user IS NULL THEN
    RAISE NOTICE 'users 테이블이 비어 있어 테스트 주문을 건너뜁니다.';
    RETURN;
  END IF;

  -- 이미 5건 이상 주문이 있으면 건너뜀
  IF (SELECT COUNT(*) FROM public.orders WHERE user_id = v_user) >= 5 THEN
    RAISE NOTICE '이미 테스트 주문이 존재합니다. 건너뜁니다.';
    RETURN;
  END IF;

  -- 상품 ID 조회
  SELECT id, price INTO v_p1, v_price1 FROM public.products WHERE name = '기본 화이트 티셔츠' LIMIT 1;
  SELECT id, price INTO v_p2, v_price2 FROM public.products WHERE name = '노이즈캔슬링 무선 이어폰' LIMIT 1;
  SELECT id, price INTO v_p3, v_price3 FROM public.products WHERE name = '슬림핏 청바지' LIMIT 1;
  SELECT id, price INTO v_p4, v_price4 FROM public.products WHERE name = '아로마 디퓨저 세트' LIMIT 1;
  SELECT id, price INTO v_p5, v_price5 FROM public.products WHERE name = '스마트워치 프로' LIMIT 1;
  SELECT id, price INTO v_p6, v_price6 FROM public.products WHERE name = '경량 러닝화' LIMIT 1;

  -- Order 1: pending (1 상품)
  INSERT INTO public.orders (user_id, status, total_price, shipping_address, created_at)
  VALUES (
    v_user, 'pending', v_price1,
    '{"name":"홍길동","phone":"010-1234-5678","zip":"06234","address1":"서울시 강남구 테헤란로 123","address2":"101호"}'::jsonb,
    now() - interval '1 day'
  ) RETURNING id INTO v_order;
  INSERT INTO public.order_items (order_id, product_id, quantity, price_at_order)
  VALUES (v_order, v_p1, 1, v_price1);

  -- Order 2: payment_confirmed (2 상품)
  INSERT INTO public.orders (user_id, status, total_price, shipping_address, created_at)
  VALUES (
    v_user, 'payment_confirmed', v_price2 + v_price3,
    '{"name":"김민수","phone":"010-9876-5432","zip":"48058","address1":"부산시 해운대구 마린시티2로 38","address2":"205호"}'::jsonb,
    now() - interval '3 days'
  ) RETURNING id INTO v_order;
  INSERT INTO public.order_items (order_id, product_id, quantity, price_at_order) VALUES
    (v_order, v_p2, 1, v_price2),
    (v_order, v_p3, 1, v_price3);

  -- Order 3: preparing (2 상품, 수량 다름)
  INSERT INTO public.orders (user_id, status, total_price, shipping_address, created_at)
  VALUES (
    v_user, 'preparing', v_price4 * 2 + v_price1,
    '{"name":"이수진","phone":"010-5555-7777","zip":"21565","address1":"인천시 남동구 논현로 123","address2":""}'::jsonb,
    now() - interval '5 days'
  ) RETURNING id INTO v_order;
  INSERT INTO public.order_items (order_id, product_id, quantity, price_at_order) VALUES
    (v_order, v_p4, 2, v_price4),
    (v_order, v_p1, 1, v_price1);

  -- Order 4: shipping (3 상품)
  INSERT INTO public.orders (user_id, status, total_price, shipping_address, created_at)
  VALUES (
    v_user, 'shipping', v_price5 + v_price6 + v_price2,
    '{"name":"박준호","phone":"010-3333-4444","zip":"35208","address1":"대전시 서구 둔산대로 100","address2":"빌라 B동 302호"}'::jsonb,
    now() - interval '7 days'
  ) RETURNING id INTO v_order;
  INSERT INTO public.order_items (order_id, product_id, quantity, price_at_order) VALUES
    (v_order, v_p5, 1, v_price5),
    (v_order, v_p6, 1, v_price6),
    (v_order, v_p2, 1, v_price2);

  -- Order 5: delivered (2 상품)
  INSERT INTO public.orders (user_id, status, total_price, shipping_address, created_at)
  VALUES (
    v_user, 'delivered', v_price3 + v_price4,
    '{"name":"최유리","phone":"010-2222-8888","zip":"61462","address1":"광주시 동구 금남로 300","address2":"오피스텔 1201호"}'::jsonb,
    now() - interval '14 days'
  ) RETURNING id INTO v_order;
  INSERT INTO public.order_items (order_id, product_id, quantity, price_at_order) VALUES
    (v_order, v_p3, 1, v_price3),
    (v_order, v_p4, 1, v_price4);

  RAISE NOTICE '테스트 주문 5건 생성 완료.';
END $$;
