import AdminVideoBackfill from '@/components/AdminVideoBackfill';

export default function AdminVideoBackfillPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">Admin</p>
          <h1 className="text-3xl font-extrabold text-zinc-900">Video Backfill</h1>
          <p className="text-zinc-500 mt-1">Manually catch listings up on missing social video platforms. Requires the cron secret.</p>
        </div>
        <AdminVideoBackfill />
      </div>
    </div>
  );
}
