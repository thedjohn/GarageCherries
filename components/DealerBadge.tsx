interface Props { listingCount: number; size?: 'sm' | 'md' }

function getBadgeTier(count: number): 'gold' | 'silver' | 'bronze' | null {
  if (count >= 30) return 'gold';
  if (count >= 15) return 'silver';
  if (count >= 5) return 'bronze';
  return null;
}

const TIERS = {
  gold:   { label: 'Gold Dealer',   bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-400' },
  silver: { label: 'Silver Dealer', bg: 'bg-zinc-100',  border: 'border-zinc-300',  text: 'text-zinc-600',  dot: 'bg-zinc-400' },
  bronze: { label: 'Bronze Dealer', bg: 'bg-orange-50', border: 'border-orange-300',text: 'text-orange-700',dot: 'bg-orange-400' },
};

export default function DealerBadge({ listingCount, size = 'md' }: Props) {
  const tier = getBadgeTier(listingCount);
  if (!tier) return null;

  const { label, bg, border, text, dot } = TIERS[tier];
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-xs gap-1.5';

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${bg} ${border} ${text} ${px}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
      {label}
    </span>
  );
}

export { getBadgeTier };
