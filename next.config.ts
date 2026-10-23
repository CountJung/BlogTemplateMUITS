import { securityHeaders } from './lib/security-headers';
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Docker 배포를 위한 standalone 빌드
  // Mutable storage and secrets are supplied at runtime, never packaged as traced assets.
  outputFileTracingExcludes: {
    instrumentation: ['./logs/**/*'],
    'next-server': ['./logs/**/*'],
    '/*': ['./data/**/*', './content/posts/**/*', './logs/**/*', './public/uploads/**/*', './.env*', './docs/**/*', './tests/**/*', './lib/*.ts', './pages/**/*.ts', './pages/**/*.tsx', './scripts/inspect-storage.cjs', './scripts/inspect-attachments.cjs', './scripts/check-standalone.cjs'],
  },
  poweredByHeader: false,
  async rewrites() {
    return { beforeFiles: [{ source: '/uploads/:path*', destination: '/api/files/:path*' }] };
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.CSP_STRICT_REPORT_ONLY === '1') }];
  },
}

export default nextConfig
