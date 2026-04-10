import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  // xlsx is a CommonJS module; prevent webpack from bundling it in API routes
  serverExternalPackages: ['xlsx'],
}

export default nextConfig
