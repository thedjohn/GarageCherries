import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  Object.assign(process.env, originalEnv);
  vi.clearAllMocks();
});

// vi.hoisted lets these variables be referenced inside vi.mock factories
const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'email-123' }));

vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return { emails: { send: mockSend } };
  }),
}));

vi.mock('@/lib/emailBranding', () => ({
  emailWrap: vi.fn((body: string) => `<wrapped>${body}</wrapped>`),
}));

import { notifyAdmin } from '@/lib/notifyAdmin';
import { Resend } from 'resend';

describe('notifyAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing when RESEND_API_KEY is not set', () => {
    delete process.env.RESEND_API_KEY;
    notifyAdmin('Test subject', 'Test body');
    expect(Resend).not.toHaveBeenCalled();
  });

  it('sends an email when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    notifyAdmin('Rate limit hit', 'IP 1.2.3.4 exceeded limit.');
    await Promise.resolve();
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('sends to an email address', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    notifyAdmin('Alert', 'body');
    await Promise.resolve();
    // ADMIN_EMAIL is resolved at module init time; just verify a `to` field is present
    expect(typeof mockSend.mock.calls[0][0].to).toBe('string');
    expect(mockSend.mock.calls[0][0].to.length).toBeGreaterThan(0);
  });

  it('prefixes subject with [GarageCherries Alert]', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    notifyAdmin('Something happened', 'details');
    await Promise.resolve();
    const { subject } = mockSend.mock.calls[0][0];
    expect(subject).toContain('[GarageCherries Alert]');
    expect(subject).toContain('Something happened');
  });

  it('includes the body in the email HTML', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    notifyAdmin('Subject', 'my alert body text');
    await Promise.resolve();
    expect(mockSend.mock.calls[0][0].html).toContain('my alert body text');
  });

  it('sends from the GarageCherries alerts address', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    notifyAdmin('x', 'y');
    await Promise.resolve();
    expect(mockSend.mock.calls[0][0].from).toContain('garagecherries.com');
  });

  it('does not throw even if send rejects', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockSend.mockRejectedValueOnce(new Error('Resend error'));
    expect(() => notifyAdmin('x', 'y')).not.toThrow();
    await new Promise(r => setTimeout(r, 10));
  });
});
