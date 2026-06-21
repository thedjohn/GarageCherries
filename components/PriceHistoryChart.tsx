import { createAdminClient } from '@/lib/supabase/server';

interface PricePoint { price: number; changed_at: string }

function formatPrice(p: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export default async function PriceHistoryChart({ carId, currentPrice }: { carId: string; currentPrice: number }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('price_history')
    .select('price, changed_at')
    .eq('car_id', carId)
    .order('changed_at', { ascending: true });

  const history: PricePoint[] = data ?? [];

  if (history.length < 2) return null;

  const prices = history.map(h => h.price);
  const min = Math.min(...prices) * 0.98;
  const max = Math.max(...prices) * 1.02;
  const range = max - min;

  const firstPrice = history[0].price;
  const lastPrice = history[history.length - 1].price;
  const diff = lastPrice - firstPrice;
  const pct = ((diff / firstPrice) * 100).toFixed(1);
  const dropped = diff < 0;

  return (
    <div className="border border-zinc-100 rounded-2xl bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-zinc-900">Price History</p>
          <p className="text-xs text-zinc-400 mt-0.5">{history.length} price points</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dropped ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {dropped ? '↓' : '↑'} {Math.abs(Number(pct))}% since listed
        </span>
      </div>

      {/* Simple SVG sparkline */}
      <div className="relative h-16 mb-3">
        <svg viewBox={`0 0 ${(history.length - 1) * 60} 48`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={dropped ? '#16a34a' : '#dc2626'}
            strokeWidth="2"
            strokeLinejoin="round"
            points={history.map((h, i) => {
              const x = i * 60;
              const y = 48 - ((h.price - min) / range) * 44;
              return `${x},${y}`;
            }).join(' ')}
          />
          {history.map((h, i) => {
            const x = i * 60;
            const y = 48 - ((h.price - min) / range) * 44;
            return <circle key={i} cx={x} cy={y} r="3" fill={dropped ? '#16a34a' : '#dc2626'} />;
          })}
        </svg>
      </div>

      {/* Price timeline */}
      <div className="space-y-1.5">
        {history.map((h, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">{formatDate(h.changed_at)}</span>
            <div className="flex items-center gap-2">
              {i > 0 && h.price < history[i - 1].price && (
                <span className="text-green-600 font-semibold">↓ {formatPrice(history[i - 1].price - h.price)} reduction</span>
              )}
              {i > 0 && h.price > history[i - 1].price && (
                <span className="text-red-500 font-semibold">↑ {formatPrice(h.price - history[i - 1].price)} increase</span>
              )}
              <span className={`font-bold ${i === history.length - 1 ? 'text-zinc-900' : 'text-zinc-500'}`}>
                {formatPrice(h.price)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
