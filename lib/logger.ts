import { Logger } from 'next-axiom';
import * as Sentry from '@sentry/nextjs';

export type LogContext = Record<string, string | number | boolean | null | undefined>;

export function createLogger(source: string) {
  const axiom = new Logger({ source });

  return {
    info(message: string, ctx?: LogContext) {
      axiom.info(message, ctx);
    },

    warn(message: string, ctx?: LogContext) {
      axiom.warn(message, ctx);
      Sentry.addBreadcrumb({ message, level: 'warning', data: ctx });
    },

    error(message: string, err?: unknown, ctx?: LogContext) {
      const errStr = err instanceof Error ? err.message : String(err ?? '');
      axiom.error(message, { ...ctx, error: errStr });
      if (err instanceof Error) {
        Sentry.captureException(err, { extra: { ...ctx, source } });
      } else {
        Sentry.captureMessage(`${message}: ${errStr}`, { level: 'error', extra: { ...ctx, source } });
      }
    },

    async flush() {
      await axiom.flush();
    },
  };
}

export function setSentryUser(id: string, email: string) {
  Sentry.setUser({ id, email });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
