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
// This page has to detect two genuinely different recovery-link formats,
// because both end up landing here (it's the only dealer-related URL in
// Supabase's Redirect URLs allow-list):
//   - Admin-generated links (dealer invite/resend emails, auth.admin.generateLink)
//     use the implicit flow and arrive as hash tokens (#access_token=...&type=recovery).
//   - Self-service "forgot password" links (resetPasswordForEmail) use the PKCE
//     flow and are surfaced via the SDK's own PASSWORD_RECOVERY event instead.
// e68eaf4 (2026-07-21) replaced hash parsing with the PASSWORD_RECOVERY listener
// to fix the second case, which silently broke the first (admin-generated links
// stopped being detected here at all) -- restored 2026-07-24 so both are handled
// side by side. See IMPLEMENTATION_STATUS.md for the full incident writeup.

describe('DealerLoginPage recovery link handling', () => {
  it('shows the normal sign-in form by default', () => {
    render(<DealerLoginPage />);
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
  });

  it('shows the password setup form for a hash-based recovery token (admin-generated link)', async () => {
    window.location.hash = '#access_token=fake-access-token&refresh_token=fake-refresh-token&type=recovery';
    mockSetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });

    render(<DealerLoginPage />);

    await waitFor(() => {
      expect(screen.getByText('Set a new password')).toBeInTheDocument();
    });
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'fake-access-token', refresh_token: 'fake-refresh-token' });
    expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument();
  });

  it('shows an invalid-link error when the hash-based token fails to establish a session', async () => {
    window.location.hash = '#access_token=fake-access-token&refresh_token=fake-refresh-token&type=recovery';
    mockSetSession.mockResolvedValue({ data: { session: null }, error: { message: 'Token has expired.' } });

    render(<DealerLoginPage />);

    await waitFor(() => {
      expect(screen.getByText('Token has expired.')).toBeInTheDocument();
    });
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
