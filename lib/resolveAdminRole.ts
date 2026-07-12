// Pure, dependency-free so it's safe to import from client components
// (unlike lib/admin.ts, which pulls in the server-only Supabase client).
export interface TeamMember { user_id: string; email: string; role: string; created_at: string; }

export function resolveAdminRole(team: TeamMember[], email: string | null | undefined): string | null {
  if (!email) return null;
  const member = team.find(m => m.email === email);
  return member?.role ?? null;
}
