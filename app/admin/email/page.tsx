import AdminEmailCampaigns from '@/components/AdminEmailCampaigns';

export default function AdminEmailPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">Admin</p>
          <h1 className="text-3xl font-extrabold text-zinc-900">Email Campaigns</h1>
          <p className="text-zinc-500 mt-1">Manually trigger email campaigns. Requires the admin API secret.</p>
        </div>
        <AdminEmailCampaigns />
      </div>
    </div>
  );
}
