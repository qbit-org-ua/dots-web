import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'https://xto.dots.org.ua/api/:path*' },
    ];
  },
};

export default nextConfig;
