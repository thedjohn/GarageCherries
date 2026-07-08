import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'derek_ljohnson@yahoo.com';

/**
 * Fire-and-forget admin alert. Never throws — safe to call without awaiting.
 */
export function notifyAdmin(subject: string, body: string): void {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  new Resend(key).emails.send({
    from: 'GarageCherries Alerts <no-reply@garagecherries.com>',
    to: ADMIN_EMAIL,
    subject: `[GarageCherries Alert] ${subject}`,
    html: emailWrap(`
        <h2 style="font-size:16px;font-weight:800;color:#18181b;margin:0 0 12px">Alert</h2>
        <div style="background:#fafafa;border:1px solid #f4f4f5;border-radius:10px;padding:20px;font-size:14px;color:#18181b;line-height:1.6;">
          ${body}
        </div>
        <p style="color:#a1a1aa;font-size:12px;margin-top:16px;">
          This is an automated alert from your GarageCherries server.
        </p>
    `),
  }).catch(err => console.error('[notifyAdmin] Failed to send alert:', err));
}
