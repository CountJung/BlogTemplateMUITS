import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Docker 배포를 위한 standalone 빌드
  // Mutable storage and secrets are supplied at runtime, never packaged as traced assets.
  outputFileTracingExcludes: {
    instrumentation: ['./logs/**/*'],
    'next-server': ['./logs/**/*'],
    '/*': ['./data/**/*', './content/posts/**/*', './logs/**/*', './public/uploads/**/*', './.env*', './docs/**/*', './tests/**/*', './lib/*.ts', './pages/**/*.ts', './pages/**/*.tsx', './scripts/inspect-attachments.cjs', './scripts/check-standalone.cjs'],
  },
  poweredByHeader: false,
  async rewrites() {
    return { beforeFiles: [{ source: '/uploads/:path*', destination: '/api/files/:path*' }] };
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'" },
    ] }];
  },
}

export default nextConfig
