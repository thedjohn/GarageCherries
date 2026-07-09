import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted so these variables exist before vi.mock factories run
const {
  mockAxiomInfo,
  mockAxiomWarn,
  mockAxiomError,
  mockAxiomFlush,
  mockAddBreadcrumb,
  mockCaptureException,
  mockCaptureMessage,
  mockSetUser,
} = vi.hoisted(() => ({
  mockAxiomInfo: vi.fn(),
  mockAxiomWarn: vi.fn(),
  mockAxiomError: vi.fn(),
  mockAxiomFlush: vi.fn().mockResolvedValue(undefined),
  mockAddBreadcrumb: vi.fn(),
  mockCaptureException: vi.fn(),
  mockCaptureMessage: vi.fn(),
  mockSetUser: vi.fn(),
}));

vi.mock('next-axiom', () => ({
  Logger: vi.fn(function () {
    return {
      info: mockAxiomInfo,
      warn: mockAxiomWarn,
      error: mockAxiomError,
      flush: mockAxiomFlush,
    };
  }),
}));

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: mockAddBreadcrumb,
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
  setUser: mockSetUser,
}));

import { createLogger, setSentryUser, clearSentryUser } from '@/lib/logger';

describe('createLogger', () => {
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createLogger('test-source');
  });

  describe('info', () => {
    it('calls axiom.info with message', () => {
      logger.info('test info message');
      expect(mockAxiomInfo).toHaveBeenCalledWith('test info message', undefined);
    });

    it('passes context to axiom', () => {
      logger.info('msg', { userId: 'u1' });
      expect(mockAxiomInfo).toHaveBeenCalledWith('msg', { userId: 'u1' });
    });

    it('does not call Sentry', () => {
      logger.info('info');
      expect(mockAddBreadcrumb).not.toHaveBeenCalled();
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('calls axiom.warn', () => {
      logger.warn('test warning');
      expect(mockAxiomWarn).toHaveBeenCalledWith('test warning', undefined);
    });

    it('adds a Sentry breadcrumb at warning level', () => {
      logger.warn('something degraded', { key: 'value' });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        message: 'something degraded',
        level: 'warning',
        data: { key: 'value' },
      });
    });

    it('does not capture Sentry exception on warn', () => {
      logger.warn('warn');
      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('calls axiom.error with message and stringified error', () => {
      const err = new Error('something broke');
      logger.error('failure', err);
      expect(mockAxiomError).toHaveBeenCalledWith(
        'failure',
        expect.objectContaining({ error: 'something broke' }),
      );
    });

    it('captures Error instances in Sentry', () => {
      const err = new Error('db down');
      logger.error('DB error', err);
      expect(mockCaptureException).toHaveBeenCalledWith(err, expect.any(Object));
    });

    it('uses captureMessage for non-Error values', () => {
      logger.error('string error', 'raw string');
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        expect.stringContaining('raw string'),
        expect.any(Object),
      );
    });

    it('handles undefined error gracefully', () => {
      expect(() => logger.error('no err')).not.toThrow();
    });

    it('passes context to axiom', () => {
      logger.error('msg', new Error('e'), { requestId: 'r1' });
      expect(mockAxiomError).toHaveBeenCalledWith(
        'msg',
        expect.objectContaining({ requestId: 'r1' }),
      );
    });
  });

  describe('flush', () => {
    it('awaits axiom.flush()', async () => {
      await logger.flush();
      expect(mockAxiomFlush).toHaveBeenCalled();
    });
  });
});

describe('setSentryUser', () => {
  it('calls Sentry.setUser with id and email', () => {
    setSentryUser('user-1', 'user@example.com');
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'user-1', email: 'user@example.com' });
  });
});

describe('clearSentryUser', () => {
  it('calls Sentry.setUser with null', () => {
    clearSentryUser();
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });
});
