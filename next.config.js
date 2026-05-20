/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['firebase-admin'],
  experimental: {
    serverActions: { bodySizeLimit: '30mb' },
  },
};
module.exports = nextConfig;
