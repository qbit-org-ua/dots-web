import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'production' ? '.next-prod' : '.next-dev',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://172.17.0.5:3001/api/:path*' },
    ];
  },
};

export default nextConfig;
