/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rpjmsncjnhtnjnycabys.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Allow favicons from media sites (used with regular img tags, not Next Image)
    unoptimized: false,
  },
}

module.exports = nextConfig
