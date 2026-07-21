import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// These tests check what our own pages do with a recovery link, independent
// of whatever format Supabase happens to send at any given time -- confirmed
// live to be hash-based (#access_token=...&type=recovery) for this project,
// but the point of these tests is to catch OUR code regressing on that shape,
// not to re-verify Supabase's behavior on every run.

const { mockOnAuthStateChange, mockUnsubscribe, mockSetSession, mockUpdateUser } = vi.hoisted(() => ({
  mockOnAuthStateChange: vi.fn(),
  mockUnsubscribe: vi.fn(),
  mockSetSession: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      setSession: mockSetSession,
      updateUser: mockUpdateUser,
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import DealerLoginPage from '@/app/dealer/login/page';
import DealerResetPasswordPage from '@/app/dealer/reset-password/page';

beforeEach(() => {
  vi.clearAllMocks();
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
  window.location.hash = '';
});

afterEach(() => {
  window.location.hash = '';
});

// ── /dealer/login ────────────────────────────────────────────────────────────
// Fixed in e68eaf4: used to manually parse the URL hash for access_token/type,
// a format that never matched what the browser client's PKCE-default flow
// actually sends -- recovery links silently fell through to this plain
// sign-in view instead of the password-setup form. Now relies on Supabase's
// own PASSWORD_RECOVERY event instead of guessing the URL shape.

describe('DealerLoginPage recovery link handling', () => {
  it('shows the normal sign-in form by default', () => {
    render(<DealerLoginPage />);
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('shows the password setup form when Supabase fires PASSWORD_RECOVERY', async () => {
    let firePasswordRecovery: (event: string) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb: (event: string) => void) => {
      firePasswordRecovery = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    render(<DealerLoginPage />);
    firePasswordRecovery('PASSWORD_RECOVERY');

    await waitFor(() => {
      expect(screen.getByText('Set a new password')).toBeInTheDocument();
    });
    expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument();
  });

  it('does not show the setup form for unrelated auth events', () => {
    let fireEvent: (event: string) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb: (event: string) => void) => {
      fireEvent = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    render(<DealerLoginPage />);
    fireEvent('SIGNED_IN');

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.queryByText('Set a new password')).not.toBeInTheDocument();
  });
});

// ── /dealer/reset-password ──────────────────────────────────────────────────
// This page was never touched by e68eaf4 -- confirmed separately (via a real
// generateLink() call, not a mock) that Supabase's admin API, used by the
// admin "Resend Setup Email" action, sends exactly the hash-based shape this
// page's existing parsing already expects. These tests lock that in.

describe('DealerResetPasswordPage recovery link handling', () => {
  it('shows the set-password form for a valid recovery token in the URL hash', async () => {
    window.location.hash = '#access_token=fake-access-token&refresh_token=fake-refresh-token&type=recovery';
    mockSetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });

    render(<DealerResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument();
    });
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'fake-access-token', refresh_token: 'fake-refresh-token' });
  });

  it('shows an invalid-link message when the hash has no token', async () => {
    window.location.hash = '';
    render(<DealerResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    });
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('shows the expired-link message when Supabase reports an error in the hash', async () => {
    window.location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    render(<DealerResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/link is invalid or has expired/i)).toBeInTheDocument();
    });
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
