import Link from 'next/link';

// Small, visible disclosure meant to sit directly next to any affiliate/referral
// link or button (financing, insurance, transport, inspection partners). FTC
// guidance requires this be "clear and conspicuous" near the link itself, not
// just mentioned in the Terms of Service.
export default function AffiliateDisclosure() {
  return (
    <p className="text-xs text-zinc-400 mt-1.5">
      We may earn a referral fee if you make a purchase through this link, at no additional cost to you.{' '}
      <Link href="/affiliate-disclosure" className="underline hover:text-zinc-600">Learn more</Link>
    </p>
  );
}
