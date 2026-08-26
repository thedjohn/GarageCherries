import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import { withAxiom } from 'next-axiom';

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', 'ssh2', 'ssh2-sftp-client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'comiuxnpvngcrvtgzpae.supabase.co' },
      { protocol: 'https', hostname: 'lirp.cdn-website.com' },
      { protocol: 'https', hostname: 'cdn.dealeraccelerate.com' },
      { protocol: 'https', hostname: 'classiccarcenter.net' },
      { protocol: 'http', hostname: 'imagescdn.dealercarsearch.com' },
      { protocol: 'https', hostname: 'www.beverlyhillscarclub.com' },
      { protocol: 'https', hostname: 'www.jtzimages.com' },
      { protocol: 'https', hostname: 'pictures.dealer.com' },
      { protocol: 'https', hostname: 'www.ellingsonmotorcars.com' },
      { protocol: 'https', hostname: 'photos.autocorner.com' },
      { protocol: 'https', hostname: 'www.garagekeptmotors.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/dealers/fastlane-cars',
        destination: '/dealers/fast-lane-classic-cars',
        permanent: true,
      },
      {
        source: '/dealers/david-brill',
        destination: '/dealers/autoarcheologist',
        permanent: true,
      },
      {
        source: '/listings/oldsmobile/cutless/025577a3-581d-4b26-8694-7a0c1d71c65b/1982-oldsmobile-cutless-1784405879348',
        destination: '/listings/oldsmobile/cutlass/025577a3-581d-4b26-8694-7a0c1d71c65b/1982-oldsmobile-cutlass-1784405879348',
        permanent: true,
      },
      {
        source: '/listings/plymouth/barracuda/5522d058-cb7b-42fc-a695-5926aeb771cc/1966-plymouth-baracuda-5522d058',
        destination: '/listings/plymouth/barracuda/5522d058-cb7b-42fc-a695-5926aeb771cc/1966-plymouth-barracuda-5522d058',
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
    disableLogger: true,
  }
);
