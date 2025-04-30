/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '*',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'categories-api.mattmcarroll.workers.dev',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '072fd33a66b9267f88238556ff22e54a.r2.cloudflarestorage.com',
        pathname: '/hiddenwalnuts-bucket/**',
      },
    ],
  },
}

module.exports = nextConfig 