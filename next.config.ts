import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'comiuxnpvngcrvtgzpae.supabase.co' },
<<<<<<< HEAD
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
=======
    ],
  },
>>>>>>> 092818e (Wire up sell form to Supabase, add admin approval page, show DB listings in browse)
};

export default nextConfig;
