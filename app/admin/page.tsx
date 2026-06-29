'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPhone } from '@/lib/data';
import { MAKES, BODY_STYLES, CONDITIONS } from '@/lib/types';

interface Listing {
  id: string; slug: string; title: string; year: number; make: string; model: string;
  price: number; mileage: number | null; condition: string; body_style: string;
  transmission: string; engine: string | null; color: string | null;
  location: string; state: string; seller_name: string; seller_phone: string;
  seller_email: string; images: string[]; description: string;
  featured: boolean; status: string; created_at: string;
}
type EditFields = Omit<Listing, 'id' | 'slug' | 'images' | 'created_at' | 'title'>;

interface TeamMember { user_id: string; email: string; role: string; created_at: string; }
interface ReportedMessage {
  id: string; body: string; sender_name: string; sender_id: string; created_at: string;
  conversation_id: string;
  conversations: { listing_title: string; buyer_name: string; buyer_email: string } | null;
}
interface SiteUser {
  id: string; email: string; name: string; created_at: string; last_sign_in_at: string | null;
  type: string;
  roles: string[];
  suspended: { reason: string | null; suspended_at: string } | null;
  dealer: { name: string; location: string; state: string; since: string | null } | null;
  advertiser: { company_name: string; website: string | null } | null;
  listings: { approved: number; pending: number; rejected: number } | null;
  watchlist_count: number;
  conversation_count: number;
}

type Tab = 'listings' | 'messages' | 'reported' | 'team' | 'users';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('listings');

  // Listings
  const [listings, setListings] = useState<Listing[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Listing | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [editFields, setEditFields] = useState<EditFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Messages
  const [conversations, setConversations] = useState<any[]>([]);

  // Reported
  const [reported, setReported] = useState<ReportedMessage[]>([]);
  const [dismissing, setDismissing] = useState<string | null>(null);

  // Team
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'moderator' | 'superadmin'>('moderator');
  const [teamWorking, setTeamWorking] = useState(false);
  const [teamError, setTeamError] = useState('');

  // Users
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [viewingSellerListings, setViewingSellerListings] = useState<SiteUser | null>(null);
  const [sellerListings, setSellerListings] = useState<Listing[]>([]);
  const [sellerListingsLoading, setSellerListingsLoading] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<SiteUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendWorking, setSuspendWorking] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<SiteUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<SiteUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<SiteUser | null>(null);
  const [promoteName, setPromoteName] = useState('');
  const [promoteLocation, setPromoteLocation] = useState('');
  const [promoteState, setPromoteState] = useState('');
  const [promoteWorking, setPromoteWorking] = useState(false);
  const [createDealer, setCreateDealer] = useState(false);
  const [newDealer, setNewDealer] = useState({ email: '', password: '', name: '', dealerName: '', location: '', state: '' });
  const [createWorking, setCreateWorking] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const res = await fetch('/api/admin/listings');
      if (!res.ok) { setLoading(false); return; }

      const { listings: listingData } = await res.json();
      setListings((listingData ?? []) as Listing[]);

      // Get role from admin_users via API response header or a separate call
      const roleRes = await fetch('/api/admin/team');
      if (roleRes.ok) {
        const { team: teamData } = await roleRes.json();
        setTeam(teamData ?? []);
        const me = (teamData ?? []).find((m: TeamMember) => m.email === user.email);
        setAdminRole(me?.role ?? 'moderator');
      }

      const [convRes, reportedRes] = await Promise.all([
        supabase.from('conversations')
          .select('id,listing_title,buyer_name,buyer_email,seller_email,last_message_at,created_at')
          .order('last_message_at', { ascending: false }),
        fetch('/api/admin/reported'),
      ]);
      setConversations(convRes.data ?? []);
      if (reportedRes.ok) {
        const { reported: rep } = await reportedRes.json();
        setReported(rep ?? []);
      }
      setLoading(false);
    });
  }, []);

  async function loadUsers() {
    if (users.length > 0) return;
    setUsersLoading(true);
    const res = await fetch('/api/admin/users');
    if (res.ok) { const { users: u } = await res.json(); setUsers(u ?? []); }
    setUsersLoading(false);
  }

  async function suspendUser() {
    if (!suspendTarget) return;
    setSuspendWorking(true);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: suspendTarget.id, action: 'suspend', reason: suspendReason }),
    });
    setUsers(prev => prev.map(u => u.id === suspendTarget.id
      ? { ...u, suspended: { reason: suspendReason, suspended_at: new Date().toISOString() } } : u));
    setSuspendTarget(null); setSuspendReason(''); setSuspendWorking(false);
  }

  async function unsuspendUser(userId: string) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, action: 'unsuspend' }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: null } : u));
  }

  async function saveUserEdit() {
    if (!editingUser) return;
    setEditUserSaving(true);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingUser.id, action: 'edit', name: editUserName, email: editUserEmail }),
    });
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: editUserName, email: editUserEmail } : u));
    setEditingUser(null); setEditUserSaving(false);
  }

  async function promoteToDealer() {
    if (!promoteTarget) return;
    setPromoteWorking(true);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: promoteTarget.id, action: 'promote', dealer: { name: promoteName, location: promoteLocation, state: promoteState } }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === promoteTarget.id
        ? { ...u, type: 'dealer', dealer: { name: promoteName, location: promoteLocation, state: promoteState, since: null } } : u));
    }
    setPromoteTarget(null); setPromoteName(''); setPromoteLocation(''); setPromoteState(''); setPromoteWorking(false);
  }

  async function deleteUser() {
    if (!confirmDeleteUser) return;
    setDeletingUser(true);
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: confirmDeleteUser.id }),
    });
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== confirmDeleteUser.id));
    setConfirmDeleteUser(null); setDeletingUser(false);
  }

  async function createDealerAccount() {
    setCreateWorking(true); setCreateError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDealer),
    });
    const json = await res.json();
    setCreateWorking(false);
    if (!res.ok) { setCreateError(json.error ?? 'Failed'); return; }
    setCreateDealer(false);
    setNewDealer({ email: '', password: '', name: '', dealerName: '', location: '', state: '' });
    setUsers([]); // force refresh
  }

  async function openSellerListings(u: SiteUser) {
    setViewingSellerListings(u);
    setSellerListings([]);
    setSellerListingsLoading(true);
    const res = await fetch(`/api/admin/listings?seller_id=${u.id}`);
    if (res.ok) {
      const { listings: ls } = await res.json();
      setSellerListings((ls ?? []) as Listing[]);
    }
    setSellerListingsLoading(false);
  }

  function openEditUser(u: SiteUser) {
    setEditingUser(u); setEditUserName(u.name); setEditUserEmail(u.email);
  }

  function openPromote(u: SiteUser) {
    setPromoteTarget(u); setPromoteName(u.name || u.email.split('@')[0]);
  }

  function openEdit(l: Listing) {
    setEditing(l);
    setEditFields({
      year: l.year, make: l.make, model: l.model, price: l.price,
      mileage: l.mileage, condition: l.condition, body_style: l.body_style,
      transmission: l.transmission, engine: l.engine, color: l.color,
      location: l.location, state: l.state, description: l.description,
      seller_name: l.seller_name, seller_phone: l.seller_phone,
      seller_email: l.seller_email, featured: l.featured, status: l.status,
    });
    setSaveError('');
  }

  async function saveEdit() {
    if (!editing || !editFields) return;
    setSaving(true); setSaveError('');
    const res = await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editing.id, ...editFields }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(json.error ?? 'Save failed'); return; }
    setListings(prev => prev.map(l => l.id === editing.id
      ? { ...l, ...editFields, title: `${editFields.year} ${editFields.make} ${editFields.model}` } : l));
    setEditing(null);
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setWorking(id + action);
    const res = await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setListings(prev => prev.map(l => l.id === id
        ? { ...l, status: action === 'approve' ? 'approved' : 'rejected' } : l));
    }
    setWorking(null);
  }

  async function deleteListing(id: string) {
    setDeleting(id);
    const res = await fetch('/api/admin/listings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    setConfirmDelete(null);
    if (res.ok) setListings(prev => prev.filter(l => l.id !== id));
  }

  async function dismissReport(msgId: string) {
    setDismissing(msgId);
    await fetch(`/api/messages/${msgId}/report`, { method: 'DELETE' }).catch(() => {});
    setReported(prev => prev.filter(r => r.id !== msgId));
    setDismissing(null);
  }

  async function addTeamMember() {
    setTeamWorking(true); setTeamError('');
    const res = await fetch('/api/admin/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, role: newRole }),
    });
    const json = await res.json();
    setTeamWorking(false);
    if (!res.ok) { setTeamError(json.error ?? 'Failed'); return; }
    setNewEmail('');
    // Refresh team list
    const teamRes = await fetch('/api/admin/team');
    if (teamRes.ok) { const { team: t } = await teamRes.json(); setTeam(t ?? []); }
  }

  async function removeTeamMember(user_id: string) {
    const res = await fetch('/api/admin/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });
    if (res.ok) setTeam(prev => prev.filter(m => m.user_id !== user_id));
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-zinc-400">Loading…</div>;
  if (!adminRole) return <div className="flex items-center justify-center min-h-screen text-zinc-400">Access denied.</div>;

  const pending = listings.filter(l => l.status === 'pending');
  const approved = listings.filter(l => l.status === 'approved');
  const rejected = listings.filter(l => l.status === 'rejected');
  const set = (k: keyof EditFields, v: string | number | boolean | null) =>
    setEditFields(f => f ? { ...f, [k]: v } : f);
  const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';
  const labelCls = 'block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1';
  const tabCls = (t: Tab) => `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-extrabold text-zinc-900">Admin</h1>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${adminRole === 'superadmin' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}>
          {adminRole}
        </span>
      </div>

      {/* Tabs — visible tabs depend on role */}
      <div className="flex gap-1 mb-6 bg-zinc-100 rounded-xl p-1 w-fit flex-wrap">
        {adminRole !== 'support' && (
          <button onClick={() => setTab('listings')} className={tabCls('listings')}>
            Listings <span className="ml-1 text-xs text-zinc-400">{pending.length} pending</span>
          </button>
        )}
        <button onClick={() => setTab('messages')} className={tabCls('messages')}>
          Messages <span className="ml-1 text-xs text-zinc-400">{conversations.length}</span>
        </button>
        {adminRole !== 'support' && (
          <button onClick={() => setTab('reported')} className={tabCls('reported')}>
            Reported
            {reported.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{reported.length}</span>
            )}
          </button>
        )}
        <button onClick={() => { setTab('users'); loadUsers(); }} className={tabCls('users')}>
          Users
        </button>
        {(adminRole === 'superadmin' || adminRole === 'admin') && (
          <button onClick={() => setTab('team')} className={tabCls('team')}>
            Team <span className="ml-1 text-xs text-zinc-400">{team.length}</span>
          </button>
        )}
      </div>

      {/* Listings tab */}
      {tab === 'listings' && <>
        <p className="text-zinc-400 text-sm mb-6">{pending.length} pending · {approved.length} approved · {rejected.length} rejected</p>
        {listings.length === 0 && <div className="text-center py-20 text-zinc-400">No listings submitted yet.</div>}
        <div className="space-y-4">
          {listings.map(l => (
            <div key={l.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex gap-4">
              {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="w-32 h-24 object-cover rounded-xl shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="font-bold text-zinc-900">{l.title}</h2>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    l.status === 'approved' ? 'bg-green-100 text-green-700' :
                    l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{l.status}</span>
                </div>
                <p className="text-sm text-zinc-500">{l.condition} · {l.location}, {l.state} · ${l.price?.toLocaleString()}</p>
                <p className="text-sm text-zinc-500">{l.seller_name} · {formatPhone(l.seller_phone)} · {l.seller_email}</p>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{l.description}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {l.status === 'pending' && (adminRole === 'moderator' || adminRole === 'admin' || adminRole === 'superadmin') && <>
                    <button onClick={() => handleAction(l.id, 'approve')} disabled={!!working}
                      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                      {working === l.id + 'approve' ? 'Approving…' : 'Approve'}
                    </button>
                    <button onClick={() => handleAction(l.id, 'reject')} disabled={!!working}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                      {working === l.id + 'reject' ? 'Rejecting…' : 'Reject'}
                    </button>
                  </>}
                  {(adminRole === 'admin' || adminRole === 'superadmin') && (
                    <button onClick={() => openEdit(l)}
                      className="px-4 py-1.5 border border-zinc-200 text-zinc-600 text-sm font-semibold rounded-lg hover:bg-zinc-50">
                      Edit
                    </button>
                  )}
                  {adminRole === 'superadmin' && (
                    <button onClick={() => setConfirmDelete(l)}
                      className="px-4 py-1.5 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* Messages tab */}
      {tab === 'messages' && (
        <div className="space-y-3">
          {conversations.length === 0 && <div className="text-center py-20 text-zinc-400">No conversations yet.</div>}
          {conversations.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-bold text-zinc-900">{c.listing_title}</p>
                <span className="text-xs text-zinc-400 shrink-0">{new Date(c.last_message_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-zinc-500">Buyer: {c.buyer_name} · {c.buyer_email}</p>
              <p className="text-sm text-zinc-500">Seller: {c.seller_email}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reported tab */}
      {tab === 'reported' && (
        <div className="space-y-3">
          {reported.length === 0 && (
            <div className="text-center py-20 text-zinc-400">
              <p className="text-3xl mb-3">✅</p>
              <p>No reported messages.</p>
            </div>
          )}
          {reported.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400 mb-1">
                    {r.conversations?.listing_title} · reported {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  <p className="font-semibold text-zinc-900 mb-0.5">{r.sender_name}</p>
                  <p className="text-sm text-zinc-700 bg-red-50 rounded-lg px-3 py-2 mt-1">&ldquo;{r.body}&rdquo;</p>
                  <p className="text-xs text-zinc-400 mt-2">
                    Conversation: {r.conversations?.buyer_name} ({r.conversations?.buyer_email})
                  </p>
                </div>
                <button
                  onClick={() => dismissReport(r.id)}
                  disabled={dismissing === r.id}
                  className="px-3 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50 shrink-0 disabled:opacity-50">
                  {dismissing === r.id ? 'Dismissing…' : 'Dismiss'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team tab — admin and superadmin */}
      {tab === 'team' && (adminRole === 'superadmin' || adminRole === 'admin') && (
        <div className="space-y-6">
          {/* Current team */}
          <div className="space-y-3">
            {team.map(m => (
              <div key={m.user_id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{m.email}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Added {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.role === 'superadmin' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    {m.role}
                  </span>
                  {adminRole === 'superadmin' && (
                    <button
                      onClick={() => removeTeamMember(m.user_id)}
                      className="text-xs text-zinc-400 hover:text-red-600 font-semibold transition-colors">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add new member — superadmin only */}
          {adminRole === 'superadmin' && <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <h2 className="font-bold text-zinc-900 mb-4">Add Team Member</h2>
            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                placeholder="Email address"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="flex-1 min-w-48 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as 'moderator' | 'superadmin')}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="support">Support</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <button
                onClick={addTeamMember}
                disabled={teamWorking || !newEmail}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors">
                {teamWorking ? 'Adding…' : 'Add'}
              </button>
            </div>
            {teamError && <p className="text-sm text-red-600 mt-2">{teamError}</p>}
            <p className="text-xs text-zinc-400 mt-3">The person must already have a GarageCherries account.</p>
          </div>}
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          {/* Search + filters */}
          <div className="flex gap-3 mb-5 flex-wrap items-center">
            <div className="relative flex-1 min-w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
              className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="all">All Roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="dealer">Dealer</option>
              <option value="advertiser">Advertiser</option>
              <option value="new">New</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)}
              className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            {adminRole === 'superadmin' && (
              <button onClick={() => setCreateDealer(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">
                + New Dealer
              </button>
            )}
          </div>

          {usersLoading && (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />)}</div>
          )}

          {!usersLoading && (() => {
            const roleBadgeStyle: Record<string, string> = {
              dealer:     'bg-blue-100 text-blue-700',
              advertiser: 'bg-purple-100 text-purple-700',
              seller:     'bg-green-100 text-green-700',
              buyer:      'bg-zinc-100 text-zinc-600',
              new:        'bg-yellow-100 text-yellow-700',
              inactive:   'bg-zinc-100 text-zinc-400',
            };
            const q = userSearch.toLowerCase();
            const filtered = users.filter(u => {
              if (q && !u.email.toLowerCase().includes(q) && !u.name.toLowerCase().includes(q)) return false;
              if (userStatusFilter === 'active' && u.suspended) return false;
              if (userStatusFilter === 'suspended' && !u.suspended) return false;
              if (userRoleFilter !== 'all' && !u.roles.includes(userRoleFilter)) return false;
              return true;
            });
            if (filtered.length === 0) return (
              <div className="text-center py-20 text-zinc-400">
                {userSearch || userRoleFilter !== 'all' || userStatusFilter !== 'all'
                  ? 'No users match your search.' : 'No users yet.'}
              </div>
            );
            return (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 mb-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
                {filtered.map(u => (
                  <div key={u.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${u.suspended ? 'border-red-200' : 'border-zinc-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-bold text-zinc-900">{u.name || '(no name)'}</p>
                          {u.roles.map(r => (
                            <span key={r} className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${roleBadgeStyle[r] ?? 'bg-zinc-100 text-zinc-500'}`}>
                              {r}
                            </span>
                          ))}
                          {u.suspended && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Suspended</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">{u.email}</p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                          {u.last_sign_in_at && ` · Last seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                          {u.listings && ` · ${u.listings.approved} active · ${u.listings.pending} pending`}
                          {(u.watchlist_count > 0 || u.conversation_count > 0) && ` · ${u.watchlist_count} watchlist · ${u.conversation_count} messages`}
                          {u.dealer && ` · ${u.dealer.name}${u.dealer.location ? ', ' + u.dealer.location : ''}`}
                          {u.advertiser && ` · ${u.advertiser.company_name}`}
                        </p>
                        {u.suspended?.reason && (
                          <p className="text-xs text-red-500 mt-1">Reason: {u.suspended.reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {u.roles.includes('seller') && (
                          <button onClick={() => openSellerListings(u)}
                            className="px-3 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                            View Listings
                          </button>
                        )}
                        {(adminRole === 'admin' || adminRole === 'superadmin') && (
                          <button onClick={() => openEditUser(u)}
                            className="px-3 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                            Edit
                          </button>
                        )}
                        {!u.suspended && (adminRole === 'moderator' || adminRole === 'admin' || adminRole === 'superadmin') &&
                          (!u.roles.includes('dealer') || adminRole === 'admin' || adminRole === 'superadmin') && (
                          <button onClick={() => setSuspendTarget(u)}
                            className="px-3 py-1.5 text-xs font-semibold border border-orange-200 rounded-lg text-orange-600 hover:bg-orange-50">
                            Suspend
                          </button>
                        )}
                        {u.suspended && (adminRole === 'admin' || adminRole === 'superadmin') && (
                          <button onClick={() => unsuspendUser(u.id)}
                            className="px-3 py-1.5 text-xs font-semibold border border-green-200 rounded-lg text-green-600 hover:bg-green-50">
                            Unsuspend
                          </button>
                        )}
                        {u.roles.includes('seller') && !u.roles.includes('dealer') && adminRole === 'superadmin' && (
                          <button onClick={() => openPromote(u)}
                            className="px-3 py-1.5 text-xs font-semibold border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50">
                            Make Dealer
                          </button>
                        )}
                        {adminRole === 'superadmin' && (
                          <button onClick={() => setConfirmDeleteUser(u)}
                            className="px-3 py-1.5 text-xs font-semibold border border-red-200 rounded-lg text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Suspend modal */}
      {suspendTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSuspendTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-zinc-900 mb-1">Suspend Account</h2>
            <p className="text-sm text-zinc-500 mb-4">{suspendTarget.email}</p>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Reason (optional)</label>
            <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
              placeholder="e.g. Spam, abusive messages"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setSuspendTarget(null)} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">Cancel</button>
              <button onClick={suspendUser} disabled={suspendWorking}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">
                {suspendWorking ? 'Suspending…' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-zinc-900 mb-4">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Name</label>
                <input value={editUserName} onChange={e => setEditUserName(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingUser(null)} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">Cancel</button>
              <button onClick={saveUserEdit} disabled={editUserSaving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">
                {editUserSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote to dealer modal */}
      {promoteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPromoteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-zinc-900 mb-1">Promote to Dealer</h2>
            <p className="text-sm text-zinc-500 mb-4">{promoteTarget.email}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Dealership Name *</label>
                <input value={promoteName} onChange={e => setPromoteName(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">City</label>
                  <input value={promoteLocation} onChange={e => setPromoteLocation(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State</label>
                  <input value={promoteState} maxLength={2} onChange={e => setPromoteState(e.target.value.toUpperCase())}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPromoteTarget(null)} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">Cancel</button>
              <button onClick={promoteToDealer} disabled={promoteWorking || !promoteName}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">
                {promoteWorking ? 'Promoting…' : 'Make Dealer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create dealer modal */}
      {createDealer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCreateDealer(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-zinc-900 mb-4">Create Dealer Account</h2>
            <div className="space-y-4">
              {[
                { label: 'Dealership Name *', key: 'dealerName', type: 'text' },
                { label: 'Contact Name', key: 'name', type: 'text' },
                { label: 'Email *', key: 'email', type: 'email' },
                { label: 'Password *', key: 'password', type: 'password' },
                { label: 'City', key: 'location', type: 'text' },
                { label: 'State', key: 'state', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{label}</label>
                  <input type={type} value={(newDealer as any)[key]}
                    onChange={e => setNewDealer(d => ({ ...d, [key]: key === 'state' ? e.target.value.toUpperCase().slice(0,2) : e.target.value }))}
                    maxLength={key === 'state' ? 2 : undefined}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              ))}
            </div>
            {createError && <p className="text-sm text-red-600 mt-3">{createError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreateDealer(false)} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">Cancel</button>
              <button onClick={createDealerAccount} disabled={createWorking || !newDealer.email || !newDealer.password || !newDealer.dealerName}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">
                {createWorking ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user confirmation */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-zinc-900 mb-2">Delete Account?</h2>
            <p className="text-sm text-zinc-500 mb-1">This will permanently delete:</p>
            <p className="font-semibold text-zinc-900 mb-1">{confirmDeleteUser.email}</p>
            <p className="text-zinc-400 text-xs mb-6">All their listings, conversations, watchlist, and alerts will also be deleted. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteUser(null)} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">Cancel</button>
              <button onClick={deleteUser} disabled={deletingUser}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">
                {deletingUser ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller listings modal */}
      {viewingSellerListings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingSellerListings(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div>
                <h2 className="font-bold text-lg text-zinc-900">Seller Listings</h2>
                <p className="text-sm text-zinc-500 mt-0.5">{viewingSellerListings.name || viewingSellerListings.email}</p>
              </div>
              <button onClick={() => setViewingSellerListings(null)} className="text-zinc-400 hover:text-zinc-700 text-xl font-bold">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {sellerListingsLoading && (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
              )}
              {!sellerListingsLoading && sellerListings.length === 0 && (
                <div className="text-center py-12 text-zinc-400">No listings found.</div>
              )}
              {!sellerListingsLoading && sellerListings.map(l => (
                <div key={l.id} className="flex gap-4 bg-white border border-zinc-100 rounded-xl p-4 mb-3 shadow-sm">
                  {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="w-24 h-18 object-cover rounded-lg shrink-0" style={{height:'72px'}} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-zinc-900 text-sm">{l.title}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        l.status === 'approved' ? 'bg-green-100 text-green-700' :
                        l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{l.status}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">${l.price?.toLocaleString()} · {l.location}, {l.state}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{new Date(l.created_at).toLocaleDateString()}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {l.slug && (
                        <a href={`/listings/${l.slug}`} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1 text-xs font-semibold border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50">
                          View ↗
                        </a>
                      )}
                      {l.status === 'pending' && (adminRole === 'moderator' || adminRole === 'admin' || adminRole === 'superadmin') && <>
                        <button onClick={async () => { await handleAction(l.id, 'approve'); setSellerListings(prev => prev.map(x => x.id === l.id ? {...x, status:'approved'} : x)); }}
                          disabled={!!working}
                          className="px-3 py-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">
                          Approve
                        </button>
                        <button onClick={async () => { await handleAction(l.id, 'reject'); setSellerListings(prev => prev.map(x => x.id === l.id ? {...x, status:'rejected'} : x)); }}
                          disabled={!!working}
                          className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50">
                          Reject
                        </button>
                      </>}
                      {(adminRole === 'admin' || adminRole === 'superadmin') && (
                        <button onClick={() => { setViewingSellerListings(null); openEdit(l); }}
                          className="px-3 py-1 text-xs font-semibold border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50">
                          Edit
                        </button>
                      )}
                      {adminRole === 'superadmin' && (
                        <button onClick={() => { setViewingSellerListings(null); setConfirmDelete(l); }}
                          className="px-3 py-1 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-zinc-900 mb-2">Delete Listing?</h2>
            <p className="text-zinc-500 text-sm mb-1">This will permanently delete:</p>
            <p className="font-semibold text-zinc-900 mb-1">{confirmDelete.title}</p>
            <p className="text-zinc-400 text-xs mb-6">All images and associated conversations will also be deleted. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteListing(confirmDelete.id)} disabled={deleting === confirmDelete.id}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
                {deleting === confirmDelete.id ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit listing modal */}
      {editing && editFields && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <h2 className="font-bold text-lg text-zinc-900">Edit Listing</h2>
              <button onClick={() => setEditing(null)} className="text-zinc-400 hover:text-zinc-700 text-xl font-bold">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Year</label><input type="number" value={editFields.year} onChange={e => set('year', Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Make</label>
                  <select value={editFields.make} onChange={e => set('make', e.target.value)} className={inputCls}>
                    {MAKES.filter(m => m !== 'All Makes').map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Model</label><input value={editFields.model} onChange={e => set('model', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Price ($)</label><input type="number" value={editFields.price} onChange={e => set('price', Number(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>Mileage</label><input type="number" value={editFields.mileage ?? ''} onChange={e => set('mileage', e.target.value ? Number(e.target.value) : null)} placeholder="Leave blank if unknown" className={inputCls} /></div>
                <div><label className={labelCls}>Condition</label>
                  <select value={editFields.condition} onChange={e => set('condition', e.target.value)} className={inputCls}>
                    {CONDITIONS.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Body Style</label>
                  <select value={editFields.body_style} onChange={e => set('body_style', e.target.value)} className={inputCls}>
                    {BODY_STYLES.filter(b => b !== 'All Styles').map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Transmission</label>
                  <select value={editFields.transmission} onChange={e => set('transmission', e.target.value)} className={inputCls}>
                    <option>Manual</option><option>Automatic</option>
                  </select>
                </div>
                <div><label className={labelCls}>Engine</label><input value={editFields.engine ?? ''} onChange={e => set('engine', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Color</label><input value={editFields.color ?? ''} onChange={e => set('color', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>City</label><input value={editFields.location} onChange={e => set('location', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>State</label><input value={editFields.state} maxLength={2} onChange={e => set('state', e.target.value.toUpperCase())} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Description</label><textarea rows={4} value={editFields.description} onChange={e => set('description', e.target.value)} className={inputCls + ' resize-none'} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Seller Name</label><input value={editFields.seller_name} onChange={e => set('seller_name', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Seller Phone</label><input value={editFields.seller_phone} onChange={e => set('seller_phone', e.target.value)} className={inputCls} /></div>
                <div className="col-span-2"><label className={labelCls}>Seller Email</label><input type="email" value={editFields.seller_email} onChange={e => set('seller_email', e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Status</label>
                  <select value={editFields.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editFields.featured} onChange={e => set('featured', e.target.checked)} className="w-4 h-4 accent-red-600" />
                    <span className="text-sm font-semibold text-zinc-700">Featured listing</span>
                  </label>
                </div>
              </div>
              {saveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
            </div>
            <div className="flex gap-3 p-6 border-t border-zinc-100">
              <button onClick={() => setEditing(null)} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
