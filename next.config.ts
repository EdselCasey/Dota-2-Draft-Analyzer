import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.dota2.com',
        pathname: '/apps/dota2/images/heroes/**',
      },
    ],
  },
};

export default nextConfig;
