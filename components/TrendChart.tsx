'use client';
import { useState } from 'react';

export interface TrendPoint { date: string; count: number }

const WIDTH = 300;
const HEIGHT = 60;
const PAD_TOP = 4;

function buildPath(points: TrendPoint[]) {
  const max = Math.max(...points.map(p => p.count), 1) * 1.15;
  const step = points.length > 1 ? WIDTH / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = PAD_TOP + (HEIGHT - PAD_TOP) * (1 - p.count / max);
    return { x, y };
  });
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT} L0,${HEIGHT} Z`;
  return { line, area, coords };
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Single-series line/area trend chart with a hover crosshair + tooltip.
// Deliberately one metric per chart (no dual axis) -- see TrendChart usage
// in the dealer dashboard for why Views and Inquiries are two separate
// charts rather than one combined chart with two differently-scaled series.
export default function TrendChart({ data, unitLabel, color = '#dc2626' }: {
  data: TrendPoint[];
  unitLabel: string;
  color?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  if (data.length === 0) return null;

  const { line, area, coords } = buildPath(data);
  const last = coords[coords.length - 1];
  const hovered = hoverIndex !== null ? { point: data[hoverIndex], coord: coords[hoverIndex] } : null;

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const i = Math.max(0, Math.min(data.length - 1, Math.round(frac * (data.length - 1))));
    setHoverIndex(i);
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: HEIGHT, display: 'block', overflow: 'visible' }}>
        <line x1={0} y1={HEIGHT - 8} x2={WIDTH} y2={HEIGHT - 8} stroke="#f4f4f5" strokeWidth={1} />
        <path d={area} fill={color} fillOpacity={0.08} stroke="none" />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r={3} fill={color} />
        {hovered && (
          <>
            <line x1={hovered.coord.x} y1={4} x2={hovered.coord.x} y2={HEIGHT - 8} stroke="#d4d4d8" strokeWidth={1} />
            <circle cx={hovered.coord.x} cy={hovered.coord.y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5} />
          </>
        )}
        <rect
          x={0} y={0} width={WIDTH} height={HEIGHT} fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute bg-zinc-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap"
          style={{
            left: `${(hovered.coord.x / WIDTH) * 100}%`,
            top: `${(hovered.coord.y / HEIGHT) * 100}%`,
            transform: 'translate(-50%, -130%)',
          }}
        >
          {formatDate(hovered.point.date)} — {hovered.point.count} {unitLabel}
        </div>
      )}
    </div>
  );
}
