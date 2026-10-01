'use client';
import { useState } from 'react';
import type { GarageVehicle } from './GarageVehicleForm';

export default function GarageVehicleCard({ vehicle, onEdit, onDelete }: {
  vehicle: GarageVehicle;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const img = vehicle.images?.[0];
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ''}`;
  const publicUrl = vehicle.is_public && vehicle.slug ? `https://www.garagecherries.com/build/${vehicle.slug}` : null;

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="w-full h-40 bg-zinc-100 flex items-center justify-center">
        {img ? (
          <img src={img} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl text-zinc-300">🚗</span>
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-zinc-900 line-clamp-1">{vehicle.nickname || title}</p>
        {vehicle.nickname && <p className="text-xs text-zinc-400 mt-0.5">{title}</p>}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {vehicle.mileage != null && (
            <span className="text-xs text-zinc-500">{vehicle.mileage.toLocaleString()} mi</span>
          )}
          {vehicle.mods.length > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {vehicle.mods.length} mod{vehicle.mods.length !== 1 ? 's' : ''}
            </span>
          )}
          {publicUrl ? (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Public</span>
          ) : (
            <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">Private</span>
          )}
        </div>

        {publicUrl && (
          <div className="flex items-center gap-2 mt-2.5">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-red-600 hover:underline">
              View public page →
            </a>
            <button onClick={copyLink} type="button"
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-600">
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={onEdit}
            className="flex-1 text-xs font-semibold text-zinc-600 border border-zinc-200 hover:border-zinc-300 rounded-lg py-2 transition-colors">
            Edit
          </button>
          <button onClick={onDelete}
            className="flex-1 text-xs font-semibold text-zinc-400 hover:text-red-500 border border-zinc-200 hover:border-red-200 rounded-lg py-2 transition-colors">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
