import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'comiuxnpvngcrvtgzpae.supabase.co' },
      { protocol: 'https', hostname: 'lirp.cdn-website.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dealers/fastlane-cars',
        destination: '/dealers/fast-lane-classic-cars',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
