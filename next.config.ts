import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import { withAxiom } from 'next-axiom';

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

export default withSentryConfig(
  withAxiom(nextConfig),
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    hideSourceMaps: true,
    disableLogger: true,
  }
);
