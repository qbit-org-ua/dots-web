import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://172.17.0.5:3001/api/:path*' },
    ];
  },
};

export default nextConfig;
