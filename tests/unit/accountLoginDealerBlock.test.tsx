import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// /account/login is the buyer sign-in. Dealers share the same auth.users
// table, so their credentials are technically valid here too -- but signing
// in would drop them into the buyer experience with no dealer dashboard,
// which reads as "my dealer account is gone." These tests lock in the
// rejection added 2026-07-24: a dealer account is signed back out (local
// scope only) and pointed at the dealer portal instead.

const { mockSignInWithPassword, mockSignOut, mockFrom, mockPush, mockRefresh } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockFrom: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword, signOut: mockSignOut },
    from: mockFrom,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/GoogleSignInButton', () => ({ default: () => null }));
vi.mock('@/components/FacebookSignInButton', () => ({ default: () => null }));

import AccountLoginPage from '@/app/account/login/page';

function setupTables({ suspended, dealer }: { suspended: boolean; dealer: boolean }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'suspended_users') {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: suspended ? { user_id: 'u1' } : null }) }) }) };
    }
    if (table === 'dealers') {
      return { select: vi.fn().mockReturnValue({ or: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: dealer ? { id: 'u1' } : null }) }) }) };
    }
    return {};
  });
}

async function submitLogin() {
  render(<AccountLoginPage />);
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'demo@dealer.com' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'u1', email: 'demo@dealer.com' } }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
});

describe('AccountLoginPage dealer-account rejection', () => {
  it('signs a dealer account back out and points at the dealer portal', async () => {
    setupTables({ suspended: false, dealer: true });
    await submitLogin();

    await waitFor(() => {
      expect(screen.getByText(/this is a dealer account/i)).toBeInTheDocument();
    });
    // Local scope only -- a live dealer session elsewhere must survive the mistake
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lets a regular buyer through unchanged', async () => {
    setupTables({ suspended: false, dealer: false });
    await submitLogin();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/account/watchlist');
    });
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(screen.queryByText(/this is a dealer account/i)).not.toBeInTheDocument();
  });

  it('still routes suspended users to the suspended page before the dealer check', async () => {
    setupTables({ suspended: true, dealer: true });
    await submitLogin();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/account/suspended');
    });
    expect(screen.queryByText(/this is a dealer account/i)).not.toBeInTheDocument();
  });
});
