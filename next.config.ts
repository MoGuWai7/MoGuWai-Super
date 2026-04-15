/**
 * next.config.ts
 *
 * Next.js 설정 파일.
 *
 * [images.remotePatterns]
 * Next.js <Image> 컴포넌트는 외부 이미지 도메인을 명시적으로 허용해야 최적화가 적용된다.
 * - *.supabase.co : Supabase Storage에 업로드된 상품 이미지
 * - picsum.photos, images.unsplash.com : 개발/시드 데이터용 샘플 이미지
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
