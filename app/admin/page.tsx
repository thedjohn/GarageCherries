'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Tooltip from '@/components/Tooltip';
import { formatPhone } from '@/lib/data';
import VehicleFieldsForm from '@/components/VehicleFieldsForm';
import AdminEmailCampaigns from '@/components/AdminEmailCampaigns';
import { resolveAdminRole, type TeamMember } from '@/lib/resolveAdminRole';

interface Listing {
  id: string; slug: string; title: string; year: number; make: string; model: string;
  price: number; mileage: number | null; condition: string; body_style: string;
  transmission: string; engine: string | null; color: string | null;
  fuel_type: string | null; drive_type: string | null; vin: string | null;
  location: string; state: string; seller_name: string; seller_phone: string;
  seller_email: string; seller_id: string; images: string[]; description: string;
  featured: boolean; status: string; created_at: string;
  rejection_reason: string | null; resubmission_note: string | null; resubmission_count: number;
  fb_posted_at: string | null;
}
// seller_id is intentionally excluded from EditFields — ownership cannot be reassigned via the admin UI
type EditFields = Omit<Listing, 'id' | 'slug' | 'seller_id' | 'images' | 'created_at' | 'title' | 'rejection_reason' | 'resubmission_note' | 'resubmission_count' | 'fb_posted_at'>;

interface ReportedMessage {
  id: string; body: string; sender_name: string; sender_id: string; created_at: string;
  conversation_id: string;
  conversations: { listing_title: string; buyer_name: string; buyer_email: string } | null;
}
interface ConvMsg {
  id: string; sender_id: string; sender_name: string; body: string; reported: boolean; created_at: string;
}
interface SiteUser {
  id: string; email: string; name: string; created_at: string; last_sign_in_at: string | null;
  type: string;
  roles: string[];
  suspended: { reason: string | null; suspended_at: string } | null;
  dealer: { name: string; location: string; state: string; since: string | null; beta_expires_at: string | null } | null;
  advertiser: { company_name: string; website: string | null; trial_ends_at: string | null } | null;
  listings: { approved: number; pending: number; rejected: number } | null;
  watchlist_count: number;
  conversation_count: number;
}

type Tab = 'listings' | 'reported' | 'team' | 'users' | 'applications' | 'events' | 'email';

interface CarEvent {
  id: string; name: string; date: string; end_date: string | null;
  start_time: string | null; end_time: string | null;
  location: string; state: string; type: string; description: string;
  url: string | null; featured: boolean; created_at: string;
  status: string; submitted_by: string | null; submitter_email: string | null; submitter_name: string | null;
}
const BLANK_EVENT = { name: '', date: '', end_date: '', start_time: '', end_time: '', location: '', state: '', type: 'show', description: '', url: '', featured: false };
const EVENT_TYPES = ['show', 'swap-meet', 'cruise', 'auction'] as const;

interface DealerApplication {
  id: string; name: string; email: string; phone: string;
  dealer_name: string; address: string | null; location: string; state: string;
  zip: string | null; website: string | null; specialties: string[];
  description: string; status: 'pending' | 'approved' | 'rejected';
  rejection_note: string | null; created_at: string; reviewed_at: string | null;
  beta_expires_at: string | null;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('listings');

  // Listings
  const [listings, setListings] = useState<Listing[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Listing | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [editing, setEditing] = useState<Listing | null>(null);
  const [editFields, setEditFields] = useState<EditFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Messages

  // Reported
  const [reported, setReported] = useState<ReportedMessage[]>([]);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [convThreads, setConvThreads] = useState<Record<string, ConvMsg[]>>({});
  const [threadLoading, setThreadLoading] = useState<string | null>(null);
  const [warningSenderId, setWarningSenderId] = useState<string | null>(null);
  const [warningText, setWarningText] = useState('');
  const [warnWorking, setWarnWorking] = useState(false);
  const [warnedMsgIds, setWarnedMsgIds] = useState<Set<string>>(new Set());
  const [suspendFromReport, setSuspendFromReport] = useState<{ id: string; name: string } | null>(null);
  const [reportSuspendReason, setReportSuspendReason] = useState('');
  const [reportSuspendWorking, setReportSuspendWorking] = useState(false);

  // Cleanup images
  const [cleanupWorking, setCleanupWorking] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; message?: string } | { error: string } | null>(null);

  // Team
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'moderator' | 'superadmin'>('moderator');
  const [teamWorking, setTeamWorking] = useState(false);
  const [teamError, setTeamError] = useState('');

  // Site settings (trial/promo durations) — superadmin only
  const [siteSettings, setSiteSettings] = useState<{ promoApplicationCutoff: string; promoExpiresAt: string; advertiserTrialDays: number; dealerDefaultTrialDays: number } | null>(null);
  const [settingsForm, setSettingsForm] = useState({ promoApplicationCutoff: '', promoExpiresAt: '', advertiserTrialDays: '', dealerDefaultTrialDays: '' });
  const [settingsWorking, setSettingsWorking] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Events
  const [events, setEvents] = useState<CarEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<CarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventForm, setEventForm] = useState<typeof BLANK_EVENT>(BLANK_EVENT);
  const [editingEvent, setEditingEvent] = useState<CarEvent | null>(null);
  const [eventWorking, setEventWorking] = useState(false);
  const [eventError, setEventError] = useState('');
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<CarEvent | null>(null);
  const [eventActionWorking, setEventActionWorking] = useState<string | null>(null);

  // Applications
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [appWorking, setAppWorking] = useState<string | null>(null);
  const [rejectingApp, setRejectingApp] = useState<string | null>(null);
  const [appRejectionNote, setAppRejectionNote] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [appPage, setAppPage] = useState(0);
  const APP_PAGE_SIZE = 10;
  const [resendingApp, setResendingApp] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const USER_PAGE_SIZE = 25;
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
  const [editDealerBetaExpires, setEditDealerBetaExpires] = useState('');
  const [editAdvertiserTrialExpires, setEditAdvertiserTrialExpires] = useState('');
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
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Resolve role first so all subsequent decisions are role-aware
        const roleRes = await fetch('/api/admin/team');
        let resolvedRole: string | null = null;
        if (roleRes.ok) {
          const { team: teamData } = await roleRes.json();
          setTeam(teamData ?? []);
          resolvedRole = resolveAdminRole(teamData ?? [], user.email);
          setAdminRole(resolvedRole);
        }

        // Support role: land on Reported tab, skip listings + conversations
        const isSupport = resolvedRole === 'support';
        if (isSupport) {
          setTab('reported');
          const reportedRes = await fetch('/api/admin/reported');
          if (reportedRes.ok) {
            const { reported: rep } = await reportedRes.json();
            setReported(rep ?? []);
          }
          setLoading(false);
          return;
        }

        // Moderator+ : load listings and conversations
        const res = await fetch('/api/admin/listings');
        if (!res.ok) { setLoading(false); return; }
        const { listings: listingData } = await res.json();
        setListings((listingData ?? []) as Listing[]);

        const [reportedRes] = await Promise.all([
          fetch('/api/admin/reported'),
        ]);
        if (reportedRes.ok) {
          const { reported: rep } = await reportedRes.json();
          setReported(rep ?? []);
        }
        setLoading(false);
      } catch (err) {
        console.error('Admin page load error:', err);
        setLoading(false);
      }
    })();
  }, []);

  async function loadUsers(page = 1, role = userRoleFilter, status = userStatusFilter) {
    setUsersLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: String(USER_PAGE_SIZE), role, status });
    const res = await fetch(`/api/admin/users?${p}`);
    if (res.ok) { const { users: u, total } = await res.json(); setUsers(u ?? []); setUsersTotal(total ?? 0); }
    setUsersLoading(false);
  }

  async function loadApplications() {
    setApplicationsLoading(true);
    const res = await fetch('/api/admin/dealer-applications');
    if (res.ok) { const { applications: a } = await res.json(); setApplications(a ?? []); }
    setApplicationsLoading(false);
  }

  async function loadEvents() {
    setEventsLoading(true);
    const res = await fetch('/api/admin/events');
    if (res.ok) {
      const { events: all } = await res.json();
      setPendingEvents((all ?? []).filter((e: CarEvent) => e.status === 'pending'));
      setEvents((all ?? []).filter((e: CarEvent) => e.status !== 'pending'));
    }
    setEventsLoading(false);
  }

  async function handleEventAction(id: string, action: 'approve' | 'reject') {
    setEventActionWorking(id + action);
    const res = await fetch('/api/admin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    setEventActionWorking(null);
    if (!res.ok) return;
    const approved = action === 'approve';
    const event = pendingEvents.find(e => e.id === id);
    setPendingEvents(prev => prev.filter(e => e.id !== id));
    if (approved && event) setEvents(prev => [...prev, { ...event, status: 'approved' }].sort((a, b) => a.date.localeCompare(b.date)));
  }

  async function saveEvent() {
    setEventWorking(true); setEventError('');
    const method = editingEvent ? 'PATCH' : 'POST';
    const body = editingEvent ? { id: editingEvent.id, ...eventForm } : eventForm;
    const res = await fetch('/api/admin/events', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setEventWorking(false);
    if (!res.ok) { setEventError(json.error ?? 'Failed'); return; }
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventForm } : e));
    } else {
      setEvents(prev => [...prev, json.event]);
    }
    setEditingEvent(null);
    setEventForm(BLANK_EVENT);
  }

  async function deleteEvent() {
    if (!confirmDeleteEvent) return;
    const res = await fetch('/api/admin/events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: confirmDeleteEvent.id }),
    });
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== confirmDeleteEvent.id));
    setConfirmDeleteEvent(null);
  }

  async function resendDealerSetup(id: string) {
    setResendingApp(id);
    const res = await fetch('/api/admin/dealer-applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'resend' }),
    });
    setResendingApp(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Failed to resend: ${json.error ?? 'Unknown error'}`);
    } else {
      alert('Setup email resent successfully.');
    }
  }

  async function handleApplication(id: string, action: 'approve' | 'reject', note?: string) {
    setAppWorking(id + action);
    const res = await fetch('/api/admin/dealer-applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, rejection_note: note ?? null }),
    });
    const json = await res.json().catch(() => ({}));
    setAppWorking(null);
    setRejectingApp(null);
    setAppRejectionNote('');
    if (res.ok) {
      setApplications(prev => prev.map(a => a.id === id
        ? { ...a, status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() } : a));
    } else {
      alert(`Failed to ${action} application: ${json.error ?? 'Unknown error'}`);
    }
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
    const body: Record<string, unknown> = { id: editingUser.id, action: 'edit', name: editUserName, email: editUserEmail };
    if (editingUser.roles.includes('dealer') && editDealerBetaExpires) {
      body.dealer = { beta_expires_at: `${editDealerBetaExpires}T23:59:59.000Z` };
    }
    if (editingUser.roles.includes('advertiser') && editAdvertiserTrialExpires) {
      body.advertiser = { trial_ends_at: `${editAdvertiserTrialExpires}T23:59:59.000Z` };
    }
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setUsers(prev => prev.map(u => {
      if (u.id !== editingUser.id) return u;
      return {
        ...u,
        name: editUserName,
        email: editUserEmail,
        dealer: u.dealer && body.dealer ? { ...u.dealer, beta_expires_at: (body.dealer as { beta_expires_at: string }).beta_expires_at } : u.dealer,
        advertiser: u.advertiser && body.advertiser ? { ...u.advertiser, trial_ends_at: (body.advertiser as { trial_ends_at: string }).trial_ends_at } : u.advertiser,
      };
    }));
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
        ? { ...u, type: 'dealer', dealer: { name: promoteName, location: promoteLocation, state: promoteState, since: null, beta_expires_at: null } } : u));
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
    setUserPage(1); loadUsers(1);
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
    setEditDealerBetaExpires(u.dealer?.beta_expires_at ? u.dealer.beta_expires_at.slice(0, 10) : '');
    setEditAdvertiserTrialExpires(u.advertiser?.trial_ends_at ? u.advertiser.trial_ends_at.slice(0, 10) : '');
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
      fuel_type: l.fuel_type, drive_type: l.drive_type, vin: l.vin,
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

  async function handleAction(id: string, action: 'approve' | 'reject', reason?: string) {
    setWorking(id + action);
    const res = await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, rejection_reason: reason ?? null }),
    });
    if (res.ok) {
      setListings(prev => prev.map(l => l.id === id
        ? { ...l, status: action === 'approve' ? 'approved' : 'rejected', rejection_reason: action === 'reject' ? (reason ?? null) : null } : l));
    }
    setRejectingId(null);
    setRejectionReason('');
    setWorking(null);
  }

  async function handleRepostFacebook(l: Listing) {
    if (l.fb_posted_at) {
      const postedDate = new Date(l.fb_posted_at).toLocaleString();
      if (!window.confirm(`This listing already posted to Facebook on ${postedDate}. Posting again will create a duplicate post on the Page. Continue anyway?`)) return;
    }
    setWorking(l.id + 'repost_facebook');
    const res = await fetch('/api/admin/listings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: l.id, action: 'repost_facebook' }),
    });
    const json = await res.json();
    setWorking(null);
    if (!res.ok || !json.success) { alert('Facebook post failed. Check Sentry/Axiom for the exact error.'); return; }
    setListings(prev => prev.map(x => x.id === l.id ? { ...x, fb_posted_at: new Date().toISOString() } : x));
  }

  function startReject(id: string) {
    setRejectingId(id);
    setRejectionReason('');
    setCustomRejectionReason('');
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

  async function loadThread(convId: string) {
    if (expandedConvId === convId) { setExpandedConvId(null); return; }
    setExpandedConvId(convId);
    if (convThreads[convId]) return;
    setThreadLoading(convId);
    const res = await fetch(`/api/admin/conversations/${convId}/messages`);
    if (res.ok) {
      const { messages } = await res.json();
      setConvThreads(prev => ({ ...prev, [convId]: messages }));
    }
    setThreadLoading(null);
  }

  async function warnUser(senderId: string, msgId: string) {
    setWarnWorking(true);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: senderId, action: 'warn', message: warningText }),
    });
    setWarnWorking(false);
    setWarningSenderId(null);
    setWarningText('');
    setWarnedMsgIds(prev => new Set(prev).add(msgId));
  }

  async function suspendFromReportFn() {
    if (!suspendFromReport) return;
    setReportSuspendWorking(true);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: suspendFromReport.id, action: 'suspend', reason: reportSuspendReason }),
    });
    setReportSuspendWorking(false);
    setSuspendFromReport(null);
    setReportSuspendReason('');
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

  async function loadSettings() {
    const res = await fetch('/api/admin/settings');
    if (!res.ok) return;
    const { settings: s } = await res.json();
    setSiteSettings(s);
    setSettingsForm({
      promoApplicationCutoff: s.promoApplicationCutoff.slice(0, 10),
      promoExpiresAt: s.promoExpiresAt.slice(0, 10),
      advertiserTrialDays: String(s.advertiserTrialDays),
      dealerDefaultTrialDays: String(s.dealerDefaultTrialDays),
    });
  }

  async function saveSettings() {
    setSettingsWorking(true); setSettingsError(''); setSettingsSaved(false);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promoApplicationCutoff: settingsForm.promoApplicationCutoff,
        promoExpiresAt: settingsForm.promoExpiresAt,
        advertiserTrialDays: Number(settingsForm.advertiserTrialDays),
        dealerDefaultTrialDays: Number(settingsForm.dealerDefaultTrialDays),
      }),
    });
    const json = await res.json();
    setSettingsWorking(false);
    if (!res.ok) { setSettingsError(json.error ?? 'Failed to save'); return; }
    setSettingsSaved(true);
    await loadSettings();
    setTimeout(() => setSettingsSaved(false), 3000);
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

        <button onClick={() => setTab('reported')} className={tabCls('reported')}>
          Reported
          {reported.length > 0 && (
            <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{reported.length}</span>
          )}
        </button>
        {adminRole !== 'support' && (
          <button onClick={() => { setTab('users'); loadUsers(); }} className={tabCls('users')}>
            Users
          </button>
        )}
        {(adminRole === 'superadmin' || adminRole === 'admin') && (
          <button onClick={() => { setTab('applications'); loadApplications(); }} className={tabCls('applications')}>
            Applications
            {applications.filter(a => a.status === 'pending').length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {applications.filter(a => a.status === 'pending').length}
              </span>
            )}
          </button>
        )}
        {(adminRole === 'superadmin' || adminRole === 'admin') && (
          <button onClick={() => { setTab('events'); if (events.length === 0) loadEvents(); }} className={tabCls('events')}>
            Events
          </button>
        )}
        {(adminRole === 'superadmin' || adminRole === 'admin') && (
          <button onClick={() => { setTab('team'); if (!siteSettings) loadSettings(); }} className={tabCls('team')}>
            Team <span className="ml-1 text-xs text-zinc-400">{team.length}</span>
          </button>
        )}
        {(adminRole === 'superadmin' || adminRole === 'admin') && (
          <button onClick={() => setTab('email')} className={tabCls('email')}>
            Email
          </button>
        )}
      </div>

      {/* Listings tab */}
      {tab === 'listings' && <>
        <p className="text-zinc-400 text-sm mb-6">{pending.length} pending · {approved.length} approved · {rejected.length} rejected</p>
        {listings.length === 0 && <div className="text-center py-20 text-zinc-400">No listings submitted yet.</div>}
        <div className="space-y-4">
          {listings.map(l => (
            <div key={l.id} className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 ${l.resubmission_count > 0 && l.status === 'pending' ? 'border-blue-200' : 'border-zinc-100'}`}>
              {l.images?.[0] && <img src={l.images[0]} alt={l.title} className="w-32 h-24 object-cover rounded-xl shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-zinc-900">{l.title}</h2>
                    {l.resubmission_count > 0 && l.status === 'pending' && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                        Resubmission #{l.resubmission_count}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    l.status === 'approved' ? 'bg-green-100 text-green-700' :
                    l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{l.status}</span>
                </div>
                <p className="text-sm text-zinc-500">{l.condition} · {l.location}, {l.state} · ${l.price?.toLocaleString()}</p>
                <p className="text-sm text-zinc-500">{l.seller_name} · {formatPhone(l.seller_phone)} · {l.seller_email}</p>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{l.description}</p>

                {/* Resubmission details */}
                {l.resubmission_count > 0 && l.status === 'pending' && (l.rejection_reason || l.resubmission_note) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {l.rejection_reason && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-600 mb-1">Previous rejection reason</p>
                        <p className="text-xs text-red-700">{l.rejection_reason}</p>
                      </div>
                    )}
                    {l.resubmission_note && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-600 mb-1">What the seller fixed</p>
                        <p className="text-xs text-blue-700">{l.resubmission_note}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Reject reason input */}
                {rejectingId === l.id && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-red-700 mb-2">Rejection reason</p>
                    <select
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm mb-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
                      <option value="">Select a reason…</option>
                      <option value="Poor photo quality — photos are too dark, blurry, or don't show the vehicle clearly.">Poor photo quality</option>
                      <option value="Insufficient photos — please add more photos showing all sides of the vehicle.">Insufficient photos</option>
                      <option value="Missing information — key details like mileage, condition, or description are incomplete.">Missing information</option>
                      <option value="Duplicate listing — this vehicle is already listed on GarageCherries.">Duplicate listing</option>
                      <option value="Suspected misrepresentation — the listing details don't match the photos or description.">Suspected misrepresentation</option>
                      <option value="Policy violation — this listing violates GarageCherries listing policies.">Policy violation</option>
                      <option value="other">Other (type below)</option>
                    </select>
                    {rejectionReason === 'other' && (
                      <textarea
                        placeholder="Describe the reason for rejection…"
                        rows={2}
                        value={customRejectionReason}
                        onChange={e => setCustomRejectionReason(e.target.value)}
                        className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(l.id, 'reject', rejectionReason === 'other' ? customRejectionReason : rejectionReason)}
                        disabled={!!working}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                        {working === l.id + 'reject' ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                      <button onClick={() => setRejectingId(null)} className="px-4 py-1.5 border border-zinc-200 text-zinc-600 text-sm font-semibold rounded-lg hover:bg-zinc-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  {l.status === 'pending' && (adminRole === 'moderator' || adminRole === 'admin' || adminRole === 'superadmin') && <>
                    <button onClick={() => handleAction(l.id, 'approve')} disabled={!!working}
                      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                      {working === l.id + 'approve' ? 'Approving…' : 'Approve'}
                    </button>
                    {rejectingId !== l.id && (
                      <span className="inline-flex items-center gap-1">
                        <button onClick={() => startReject(l.id)} disabled={!!working}
                          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                          Reject
                        </button>
                        <Tooltip text="Sends the seller a rejection email with your reason. They can edit and resubmit the listing." />
                      </span>
                    )}
                  </>}
                  {(adminRole === 'admin' || adminRole === 'superadmin') && (
                    <button onClick={() => openEdit(l)}
                      className="px-4 py-1.5 border border-zinc-200 text-zinc-600 text-sm font-semibold rounded-lg hover:bg-zinc-50">
                      Edit
                    </button>
                  )}
                  {(adminRole === 'admin' || adminRole === 'superadmin') && l.status === 'approved' && (
                    <span className="inline-flex items-center gap-1">
                      <button onClick={() => handleRepostFacebook(l)} disabled={!!working}
                        className="px-4 py-1.5 border border-blue-200 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50">
                        {working === l.id + 'repost_facebook' ? 'Posting…' : l.fb_posted_at ? 'Repost to Facebook' : 'Post to Facebook'}
                      </button>
                      <Tooltip text={l.fb_posted_at
                        ? `Already posted to the Facebook Page on ${new Date(l.fb_posted_at).toLocaleString()}. Reposting will create a duplicate.`
                        : 'Manually post this listing to the GarageCherries Facebook Page.'} />
                    </span>
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


      {/* Reported tab */}
      {tab === 'reported' && (
        <div className="space-y-3">
          {reported.length === 0 && (
            <div className="text-center py-20 text-zinc-400">
              <p className="text-3xl mb-3">✅</p>
              <p>No reported messages.</p>
            </div>
          )}
          {reported.map(r => {
            const isExpanded = expandedConvId === r.conversation_id;
            const thread = convThreads[r.conversation_id];
            const isLoadingThread = threadLoading === r.conversation_id;
            const isWarning = warningSenderId === r.sender_id;
            const isSuspending = suspendFromReport?.id === r.sender_id;
            const isWarned = warnedMsgIds.has(r.id);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                {/* Header — click to expand */}
                <button
                  className="w-full text-left p-5 hover:bg-red-50/30 transition-colors"
                  onClick={() => loadThread(r.conversation_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400 mb-1">
                        {r.conversations?.listing_title} · reported {new Date(r.created_at).toLocaleDateString()}
                      </p>
                      <p className="font-semibold text-zinc-900 mb-1">{r.sender_name}</p>
                      <p className="text-sm text-zinc-600 bg-red-50 rounded-lg px-3 py-2 line-clamp-2">&ldquo;{r.body}&rdquo;</p>
                      <p className="text-xs text-zinc-400 mt-2">
                        Other party: {r.conversations?.buyer_name} ({r.conversations?.buyer_email})
                      </p>
                    </div>
                    <span className="text-zinc-400 text-sm shrink-0 mt-1">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Expanded: full thread */}
                {isExpanded && (
                  <div className="border-t border-red-100 px-5 pb-5 pt-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Full Conversation</p>

                    {isLoadingThread && (
                      <div className="py-6 text-center text-zinc-400 text-sm">Loading thread…</div>
                    )}

                    {thread && (
                      <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
                        {thread.map(msg => {
                          const isReported = msg.reported;
                          const isSender = msg.sender_id === r.sender_id;
                          return (
                            <div key={msg.id} className={`flex gap-2.5 ${isSender ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isReported
                                  ? 'bg-red-100 border border-red-300'
                                  : isSender
                                  ? 'bg-zinc-100'
                                  : 'bg-zinc-50 border border-zinc-100'
                              }`}>
                                <p className={`text-xs font-semibold mb-0.5 ${isReported ? 'text-red-600' : 'text-zinc-500'}`}>
                                  {msg.sender_name}{isReported && ' · reported'}
                                </p>
                                <p className={`text-sm ${isReported ? 'text-red-800' : 'text-zinc-700'}`}>{msg.body}</p>
                                <p className="text-[10px] text-zinc-400 mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Warn inline form */}
                    {isWarning && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                        <p className="text-xs font-semibold text-amber-700 mb-2">Warning message to {r.sender_name}</p>
                        <textarea
                          rows={3}
                          value={warningText}
                          onChange={e => setWarningText(e.target.value)}
                          placeholder="Describe the violation or leave blank for the default message…"
                          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => warnUser(r.sender_id, r.id)}
                            disabled={warnWorking}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                            {warnWorking ? 'Sending…' : 'Send Warning'}
                          </button>
                          <button onClick={() => { setWarningSenderId(null); setWarningText(''); }}
                            className="px-4 py-1.5 border border-zinc-200 text-zinc-500 text-xs font-semibold rounded-lg hover:bg-zinc-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Suspend inline form */}
                    {isSuspending && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3">
                        <p className="text-xs font-semibold text-orange-700 mb-2">Suspend {r.sender_name}</p>
                        <input
                          value={reportSuspendReason}
                          onChange={e => setReportSuspendReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={suspendFromReportFn}
                            disabled={reportSuspendWorking}
                            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                            {reportSuspendWorking ? 'Suspending…' : 'Confirm Suspend'}
                          </button>
                          <button onClick={() => { setSuspendFromReport(null); setReportSuspendReason(''); }}
                            className="px-4 py-1.5 border border-zinc-200 text-zinc-500 text-xs font-semibold rounded-lg hover:bg-zinc-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Warning sent confirmation */}
                    {isWarned && (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
                          <span>⚠️</span>
                          <span>Warning sent to {r.sender_name}</span>
                        </div>
                        <button
                          onClick={() => dismissReport(r.id)}
                          className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900">
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isWarning && !isSuspending && !isWarned && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => dismissReport(r.id)}
                          disabled={!!dismissing}
                          className="px-4 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50 disabled:opacity-50">
                          {dismissing === r.id ? 'Dismissing…' : 'Dismiss'}
                        </button>
                        <button
                          onClick={() => { setWarningSenderId(r.sender_id); setSuspendFromReport(null); }}
                          className="px-4 py-1.5 text-xs font-semibold border border-amber-200 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors">
                          Warn User
                        </button>
                        {(adminRole === 'moderator' || adminRole === 'admin' || adminRole === 'superadmin') && (
                          <button
                            onClick={() => { setSuspendFromReport({ id: r.sender_id, name: r.sender_name }); setWarningSenderId(null); }}
                            className="px-4 py-1.5 text-xs font-semibold border border-orange-200 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors">
                            Suspend User
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Team tab — admin and superadmin */}
      {/* Applications tab */}
      {tab === 'applications' && (adminRole === 'superadmin' || adminRole === 'admin') && (
        <div>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => {
              const count = f === 'all' ? applications.length : applications.filter(a => a.status === f).length;
              return (
                <button key={f} onClick={() => { setAppFilter(f); setAppPage(0); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    appFilter === f ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
          {applicationsLoading && <div className="text-center py-20 text-zinc-400 text-sm">Loading…</div>}
          {!applicationsLoading && applications.length === 0 && (
            <div className="text-center py-20 text-zinc-400 text-sm">No dealer applications yet.</div>
          )}
          <div className="space-y-4">
            {(appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter))
              .slice(appPage * APP_PAGE_SIZE, (appPage + 1) * APP_PAGE_SIZE)
              .map(app => (
              <div key={app.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${app.status === 'pending' ? 'border-yellow-200' : 'border-zinc-100'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-bold text-zinc-900">{app.dealer_name}</h2>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        app.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{app.status}</span>
                    </div>
                    <p className="text-sm text-zinc-500">{app.location}, {app.state}{app.zip ? ` ${app.zip}` : ''}</p>
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">{new Date(app.created_at).toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                  <div><span className="text-zinc-400">Contact: </span><span className="text-zinc-700">{app.name}</span></div>
                  <div><span className="text-zinc-400">Email: </span><span className="text-zinc-700">{app.email}</span></div>
                  <div><span className="text-zinc-400">Phone: </span><span className="text-zinc-700">{app.phone}</span></div>
                  {app.website && <div><span className="text-zinc-400">Website: </span><a href={app.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">{app.website}</a></div>}
                  {app.specialties?.length > 0 && (
                    <div className="col-span-2"><span className="text-zinc-400">Specialties: </span><span className="text-zinc-700">{app.specialties.join(', ')}</span></div>
                  )}
                </div>

                <p className="text-sm text-zinc-600 bg-zinc-50 rounded-xl p-3 mb-4">{app.description}</p>

                {app.status === 'pending' && (
                  <div>
                    {rejectingApp === app.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={appRejectionNote}
                          onChange={e => setAppRejectionNote(e.target.value)}
                          placeholder="Optional note to include in the rejection (not sent to applicant yet)"
                          className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApplication(app.id, 'reject', appRejectionNote)}
                            disabled={appWorking === app.id + 'reject'}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                            {appWorking === app.id + 'reject' ? 'Rejecting…' : 'Confirm Reject'}
                          </button>
                          <button onClick={() => { setRejectingApp(null); setAppRejectionNote(''); }}
                            className="px-4 py-1.5 border border-zinc-200 text-zinc-500 text-xs font-semibold rounded-lg hover:bg-zinc-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApplication(app.id, 'approve')}
                          disabled={!!appWorking}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                          {appWorking === app.id + 'approve' ? 'Approving…' : 'Approve'}
                        </button>
                        <span className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setRejectingApp(app.id)}
                            className="px-4 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                            Reject
                          </button>
                          <Tooltip text="Declines this dealer application. The applicant is not notified automatically — use the note field to record your reason." />
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {app.status === 'rejected' && app.rejection_note && (
                  <p className="text-xs text-zinc-400 mt-2">Note: {app.rejection_note}</p>
                )}
                {app.status === 'approved' && (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <p className="text-xs text-green-600">
                      {app.beta_expires_at
                        ? `Account created — beta expires ${new Date(app.beta_expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
                        : 'Account created.'}
                    </p>
                    <button
                      onClick={() => { setUserSearch(app.email); setTab('users'); loadUsers(); }}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 hover:underline">
                      Edit in Users tab →
                    </button>
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => resendDealerSetup(app.id)}
                        disabled={resendingApp === app.id}
                        className="px-3 py-1 text-xs font-semibold border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors">
                        {resendingApp === app.id ? 'Sending…' : 'Resend Setup Email'}
                      </button>
                      <Tooltip text="Generates a fresh password-setup link and emails it to the dealer. Use this if their original setup email expired or they never received it." />
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Pagination */}
          {(() => {
            const filtered = appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter);
            const totalPages = Math.ceil(filtered.length / APP_PAGE_SIZE);
            if (totalPages <= 1) return null;
            return (
              <div className="flex items-center justify-between mt-6 text-sm">
                <p className="text-zinc-400">
                  Showing {appPage * APP_PAGE_SIZE + 1}–{Math.min((appPage + 1) * APP_PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setAppPage(p => p - 1)} disabled={appPage === 0}
                    className="px-3 py-1.5 border border-zinc-200 rounded-lg disabled:opacity-40 hover:border-zinc-400 transition-colors">
                    ← Prev
                  </button>
                  <button onClick={() => setAppPage(p => p + 1)} disabled={appPage >= totalPages - 1}
                    className="px-3 py-1.5 border border-zinc-200 rounded-lg disabled:opacity-40 hover:border-zinc-400 transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'team' && (adminRole === 'superadmin' || adminRole === 'admin') && (
        <><div className="space-y-6">
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

        {/* Cleanup orphan images — superadmin only */}
        {adminRole === 'superadmin' && (
          <div className="mt-4 bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-zinc-900">Cleanup Orphan Images</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Deletes uploaded images not attached to any listing and older than 24 hours.</p>
                {cleanupResult && (
                  <p className={`text-sm mt-2 font-medium ${'error' in cleanupResult ? 'text-red-600' : 'text-green-700'}`}>
                    {'error' in cleanupResult
                      ? `Error: ${cleanupResult.error}`
                      : cleanupResult.message ?? `Deleted ${cleanupResult.deleted} orphaned image${cleanupResult.deleted !== 1 ? 's' : ''}.`}
                  </p>
                )}
              </div>
              <button
                onClick={async () => {
                  setCleanupWorking(true);
                  setCleanupResult(null);
                  try {
                    const res = await fetch('/api/admin/cleanup-images', { method: 'POST' });
                    const data = await res.json();
                    setCleanupResult(data);
                  } catch (e) {
                    setCleanupResult({ error: String(e) });
                  } finally {
                    setCleanupWorking(false);
                  }
                }}
                disabled={cleanupWorking}
                className="flex-shrink-0 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors"
              >
                {cleanupWorking ? 'Running…' : 'Run Now'}
              </button>
            </div>
          </div>
        )}

        {/* Trial & promo settings — superadmin only */}
        {adminRole === 'superadmin' && (
          <div className="mt-4 bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900">Trial &amp; Promo Settings</h3>
            <p className="text-sm text-zinc-500 mt-0.5 mb-4">Controls free-account durations for new dealer approvals and advertiser signups. Existing accounts aren't affected — use Users tab → Edit to override a specific account.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Promo Application Cutoff</label>
                <input type="date" value={settingsForm.promoApplicationCutoff}
                  onChange={e => setSettingsForm(f => ({ ...f, promoApplicationCutoff: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                <p className="text-xs text-zinc-400 mt-1">Dealer applications submitted before this date get the promo rate.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Promo Expires At</label>
                <input type="date" value={settingsForm.promoExpiresAt}
                  onChange={e => setSettingsForm(f => ({ ...f, promoExpiresAt: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                <p className="text-xs text-zinc-400 mt-1">Free access ends for promo dealers/sellers/advertisers on this date.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Advertiser Trial (days)</label>
                <input type="number" min={1} value={settingsForm.advertiserTrialDays}
                  onChange={e => setSettingsForm(f => ({ ...f, advertiserTrialDays: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Dealer Default Trial (days)</label>
                <input type="number" min={1} value={settingsForm.dealerDefaultTrialDays}
                  onChange={e => setSettingsForm(f => ({ ...f, dealerDefaultTrialDays: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                <p className="text-xs text-zinc-400 mt-1">Applied to dealer applications submitted after the promo cutoff.</p>
              </div>
            </div>
            {settingsError && <p className="text-sm text-red-600 mt-3">{settingsError}</p>}
            {settingsSaved && <p className="text-sm text-green-700 mt-3 font-medium">Saved.</p>}
            <button onClick={saveSettings} disabled={settingsWorking}
              className="mt-4 bg-zinc-900 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors">
              {settingsWorking ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
    </>)}

      {/* Email tab */}
      {tab === 'email' && (adminRole === 'superadmin' || adminRole === 'admin') && (
        <AdminEmailCampaigns />
      )}

      {/* Events tab */}
      {tab === 'events' && (adminRole === 'superadmin' || adminRole === 'admin') && (
        <div>
          {/* Pending submissions queue */}
          {pendingEvents.length > 0 && (
            <div className="mb-6">
              <h2 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
                Pending Submissions
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingEvents.length}</span>
              </h2>
              <div className="space-y-3">
                {pendingEvents.map(e => (
                  <div key={e.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{e.type}</span>
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                        </div>
                        <p className="font-semibold text-zinc-900 text-sm">{e.name}</p>
                        <p className="text-xs text-zinc-500">{e.date}{e.end_date ? ` – ${e.end_date}` : ''} · {e.location}, {e.state}</p>
                        {e.description && <p className="text-xs text-zinc-400 mt-0.5">{e.description}</p>}
                        {e.url && <p className="text-xs text-blue-500 mt-0.5 truncate"><a href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a></p>}
                        <p className="text-xs text-zinc-400 mt-1">Submitted by: {e.submitter_name ?? 'Unknown'} ({e.submitter_email ?? '—'})</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleEventAction(e.id, 'approve')}
                          disabled={eventActionWorking !== null}
                          className="text-xs font-bold px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                          {eventActionWorking === e.id + 'approve' ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleEventAction(e.id, 'reject')}
                          disabled={eventActionWorking !== null}
                          className="text-xs font-bold px-3 py-1.5 bg-zinc-100 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 text-zinc-600 rounded-lg transition-colors">
                          {eventActionWorking === e.id + 'reject' ? '…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add / Edit form */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="font-bold text-zinc-900 mb-4">{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="md:col-span-2">
                <label className={labelCls}>Event Name *</label>
                <input className={inputCls} value={eventForm.name} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Muscle Car & Corvette Nationals" />
              </div>
              <div>
                <label className={labelCls}>Start Date *</label>
                <input type="date" className={inputCls} value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>End Date (optional)</label>
                <input type="date" className={inputCls} value={eventForm.end_date} onChange={e => setEventForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Start Time (optional)</label>
                <input type="time" className={inputCls} value={eventForm.start_time} onChange={e => setEventForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>End Time (optional)</label>
                <input type="time" className={inputCls} value={eventForm.end_time} onChange={e => setEventForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>City *</label>
                <input className={inputCls} value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Springfield" />
              </div>
              <div>
                <label className={labelCls}>State *</label>
                <input className={inputCls} value={eventForm.state} maxLength={2} onChange={e => setEventForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} placeholder="IL" />
              </div>
              <div>
                <label className={labelCls}>Type *</label>
                <select className={inputCls} value={eventForm.type} onChange={e => setEventForm(f => ({ ...f, type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Website URL</label>
                <input className={inputCls} value={eventForm.url} onChange={e => setEventForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea className={inputCls} rows={2} value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief event description…" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="evt-featured" checked={eventForm.featured} onChange={e => setEventForm(f => ({ ...f, featured: e.target.checked }))} className="accent-red-600" />
                <label htmlFor="evt-featured" className="text-sm font-medium text-zinc-700">Featured event</label>
              </div>
            </div>
            {eventError && <p className="text-sm text-red-600 mb-2">{eventError}</p>}
            <div className="flex gap-3">
              <button onClick={saveEvent} disabled={eventWorking || !eventForm.name || !eventForm.date || !eventForm.location || !eventForm.state}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors">
                {eventWorking ? 'Saving…' : editingEvent ? 'Save Changes' : 'Add Event'}
              </button>
              {editingEvent && (
                <button onClick={() => { setEditingEvent(null); setEventForm(BLANK_EVENT); setEventError(''); }}
                  className="px-5 py-2 border border-zinc-200 text-zinc-600 font-semibold text-sm rounded-lg hover:bg-zinc-50 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Event list */}
          {eventsLoading && <div className="text-center py-10 text-zinc-400">Loading…</div>}
          {!eventsLoading && events.length === 0 && (
            <div className="text-center py-10 text-zinc-400">No events yet. Add one above.</div>
          )}
          <div className="space-y-3">
            {events.map(e => (
              <div key={e.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{e.type}</span>
                    {e.featured && <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600">Featured</span>}
                  </div>
                  <p className="font-semibold text-zinc-900 text-sm">{e.name}</p>
                  <p className="text-xs text-zinc-500">{e.date}{e.end_date ? ` – ${e.end_date}` : ''} · {e.location}, {e.state}</p>
                  {e.description && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{e.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditingEvent(e); setEventForm({ name: e.name, date: e.date, end_date: e.end_date ?? '', start_time: e.start_time ?? '', end_time: e.end_time ?? '', location: e.location, state: e.state, type: e.type, description: e.description, url: e.url ?? '', featured: e.featured }); }}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">Edit</button>
                  <button onClick={() => setConfirmDeleteEvent(e)}
                    className="text-xs font-semibold text-zinc-400 hover:text-red-600 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {/* Delete confirm modal */}
          {confirmDeleteEvent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="font-bold text-zinc-900 mb-2">Delete event?</h3>
                <p className="text-sm text-zinc-500 mb-4">&ldquo;{confirmDeleteEvent.name}&rdquo; will be permanently removed from the calendar.</p>
                <div className="flex gap-3">
                  <button onClick={deleteEvent} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2 rounded-xl transition-colors">Delete</button>
                  <button onClick={() => setConfirmDeleteEvent(null)} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold text-sm py-2 rounded-xl hover:bg-zinc-50 transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          )}
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
            <select value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); setUserPage(1); loadUsers(1, e.target.value, userStatusFilter); }}
              className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="all">All Roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="dealer">Dealer</option>
              <option value="advertiser">Advertiser</option>
              <option value="new">New</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={userStatusFilter} onChange={e => { setUserStatusFilter(e.target.value); setUserPage(1); loadUsers(1, userRoleFilter, e.target.value); }}
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
            // Primary type: first match in priority order
            const primaryType = (u: SiteUser) => {
              if (u.roles.includes('dealer'))     return 'dealer';
              if (u.roles.includes('advertiser')) return 'advertiser';
              if (u.roles.includes('seller'))     return 'seller';
              return 'buyer';
            };
            const typeConfig: Record<string, { icon: string; border: string; badge: string; label: string }> = {
              dealer:     { icon: '🏢', border: 'border-l-blue-400',   badge: 'bg-blue-100 text-blue-700',   label: 'Dealer' },
              advertiser: { icon: '📢', border: 'border-l-purple-400', badge: 'bg-purple-100 text-purple-700', label: 'Advertiser' },
              seller:     { icon: '🧑', border: 'border-l-green-400',  badge: 'bg-green-100 text-green-700',  label: 'Seller' },
              buyer:      { icon: '👤', border: 'border-l-zinc-300',   badge: 'bg-zinc-100 text-zinc-600',    label: 'Buyer' },
            };
            const secondaryBadge: Record<string, string> = {
              buyer:    'bg-zinc-100 text-zinc-400',
              new:      'bg-yellow-100 text-yellow-600',
              inactive: 'bg-zinc-100 text-zinc-400',
            };
            const q = userSearch.toLowerCase();
            const filtered = users.filter(u =>
              !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
            );
            const totalPages = Math.max(1, Math.ceil(usersTotal / USER_PAGE_SIZE));
            if (filtered.length === 0) return (
              <div className="text-center py-20 text-zinc-400">
                {userSearch || userRoleFilter !== 'all' || userStatusFilter !== 'all'
                  ? 'No users match your search.' : 'No users yet.'}
              </div>
            );
            return (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 mb-3">{usersTotal} user{usersTotal !== 1 ? 's' : ''} · page {userPage} of {totalPages}</p>
                {filtered.map(u => {
                  const pt = primaryType(u);
                  const cfg = typeConfig[pt];
                  return (
                  <div key={u.id} className={`bg-white rounded-2xl border-l-4 border border-zinc-100 shadow-sm p-5 ${u.suspended ? 'border-l-red-400 border-red-200' : cfg.border}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-base leading-none">{cfg.icon}</span>
                          <p className="font-bold text-zinc-900">{u.name || '(no name)'}</p>
                          {/* Primary type badge — prominent */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          {/* Secondary roles — dimmer */}
                          {u.roles.filter(r => r !== pt && r !== 'buyer' || (r === 'buyer' && pt !== 'buyer')).map(r => (
                            <span key={r} className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${secondaryBadge[r] ?? 'bg-zinc-100 text-zinc-400'}`}>
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
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => setSuspendTarget(u)}
                              className="px-3 py-1.5 text-xs font-semibold border border-orange-200 rounded-lg text-orange-600 hover:bg-orange-50">
                              Suspend
                            </button>
                            <Tooltip text="Blocks this account from signing in and shows a suspension notice. Reversible — use Unsuspend to restore access. For permanent removal, delete the account instead." />
                          </span>
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
                );
                })}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <button
                      onClick={() => { const p = userPage - 1; setUserPage(p); loadUsers(p); }}
                      disabled={userPage <= 1}
                      className="px-4 py-2 text-sm font-semibold border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      ← Previous
                    </button>
                    <span className="text-xs text-zinc-400">{userPage} / {totalPages}</span>
                    <button
                      onClick={() => { const p = userPage + 1; setUserPage(p); loadUsers(p); }}
                      disabled={userPage >= totalPages}
                      className="px-4 py-2 text-sm font-semibold border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      Next →
                    </button>
                  </div>
                )}
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
              {editingUser.roles.includes('dealer') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Dealer Beta Expires</label>
                  <input type="date" value={editDealerBetaExpires} onChange={e => setEditDealerBetaExpires(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              )}
              {editingUser.roles.includes('advertiser') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Advertiser Trial Ends</label>
                  <input type="date" value={editAdvertiserTrialExpires} onChange={e => setEditAdvertiserTrialExpires(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              )}
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
                      {(() => {
                        const seg = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        const url = `/listings/${seg(l.make)}/${seg(l.model)}/${l.id}/${l.slug}`;
                        return (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1 text-xs font-semibold border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50">
                            View ↗
                          </a>
                        );
                      })()}
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
              <VehicleFieldsForm
                inputClassName={inputCls}
                labelClassName={labelCls}
                values={{
                  year: String(editFields.year), make: editFields.make, model: editFields.model,
                  mileage: editFields.mileage != null ? String(editFields.mileage) : '',
                  condition: editFields.condition, bodyStyle: editFields.body_style,
                  fuelType: editFields.fuel_type ?? '', engine: editFields.engine ?? '',
                  transmission: editFields.transmission, driveType: editFields.drive_type ?? '',
                  color: editFields.color ?? '', price: String(editFields.price),
                  description: editFields.description,
                }}
                onChange={(k, v) => {
                  if (k === 'year' || k === 'price') return set(k, Number(v.replace(/,/g, '')) || 0);
                  if (k === 'mileage') return set('mileage', v ? Number(v.replace(/,/g, '')) : null);
                  if (k === 'bodyStyle') return set('body_style', v);
                  if (k === 'fuelType') return set('fuel_type', v);
                  if (k === 'driveType') return set('drive_type', v);
                  return set(k, v);
                }}
              />
              <div>
                <label className={labelCls}>VIN <span className="normal-case font-normal text-zinc-400">(optional)</span></label>
                <input value={editFields.vin ?? ''} maxLength={17} onChange={e => set('vin', e.target.value.toUpperCase())} className={inputCls + ' font-mono'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>City</label><input value={editFields.location} onChange={e => set('location', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>State</label><input value={editFields.state} maxLength={2} onChange={e => set('state', e.target.value.toUpperCase())} className={inputCls} /></div>
              </div>
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Seller (read-only — managed in seller profile)</p>
                <p className="text-sm text-zinc-700"><span className="font-medium">Name:</span> {editFields.seller_name || '—'}</p>
                <p className="text-sm text-zinc-700"><span className="font-medium">Phone:</span> {editFields.seller_phone || '—'}</p>
                <p className="text-sm text-zinc-700"><span className="font-medium">Email:</span> {editFields.seller_email || '—'}</p>
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
