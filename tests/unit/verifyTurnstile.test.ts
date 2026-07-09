import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstile } from '@/lib/verifyTurnstile';

const originalEnv = { ...process.env };

afterEach(() => {
  Object.assign(process.env, originalEnv);
  vi.restoreAllMocks();
});

function mockFetch(success: boolean) {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    json: async () => ({ success }),
  } as Response);
}

describe('verifyTurnstile', () => {
  describe('when TURNSTILE_SECRET_KEY is not set', () => {
    beforeEach(() => {
      delete process.env.TURNSTILE_SECRET_KEY;
    });

    it('returns true (skips verification)', async () => {
      const result = await verifyTurnstile('any-token');
      expect(result).toBe(true);
    });

    it('does not call fetch', async () => {
      const spy = vi.spyOn(global, 'fetch');
      await verifyTurnstile('token');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('when TURNSTILE_SECRET_KEY is set', () => {
    beforeEach(() => {
      process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    });

    it('returns false for null token', async () => {
      const spy = vi.spyOn(global, 'fetch');
      const result = await verifyTurnstile(null);
      expect(result).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });

    it('returns true when Cloudflare returns success: true', async () => {
      mockFetch(true);
      const result = await verifyTurnstile('valid-token');
      expect(result).toBe(true);
    });

    it('returns false when Cloudflare returns success: false', async () => {
      mockFetch(false);
      const result = await verifyTurnstile('invalid-token');
      expect(result).toBe(false);
    });

    it('calls the v0 siteverify endpoint', async () => {
      const spy = mockFetch(true);
      await verifyTurnstile('a-token');
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/turnstile/v0/siteverify'),
        expect.any(Object),
      );
    });

    it('sends POST with the secret and token in JSON body', async () => {
      const spy = mockFetch(true);
      await verifyTurnstile('my-token');
      const [, options] = spy.mock.calls[0];
      expect((options as RequestInit).method).toBe('POST');
      const body = JSON.parse((options as RequestInit).body as string);
      expect(body.secret).toBe('test-secret');
      expect(body.response).toBe('my-token');
    });

    it('returns false when fetch throws', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
      const result = await verifyTurnstile('token');
      expect(result).toBe(false);
    });

    it('returns false when response.json throws', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        json: async () => { throw new Error('bad json'); },
      } as unknown as Response);
      const result = await verifyTurnstile('token');
      expect(result).toBe(false);
    });
  });
});
