import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: '.next-dev',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://172.17.0.5:3001/api/:path*' },
    ];
  },
};

export default nextConfig;
