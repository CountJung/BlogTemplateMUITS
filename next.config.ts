import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Docker 배포를 위한 standalone 빌드
}

export default nextConfig