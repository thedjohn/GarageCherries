import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

const resend = new Resend(process.env.RESEND_API_KEY);

const CATEGORIES: Record<string, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  general: 'General Feedback',
};

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed } = rateLimit(`feedback:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 });

  const { category, message, email } = await req.json();

  if (!category || !CATEGORIES[category]) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  if (!message?.trim() || message.trim().length < 10) return NextResponse.json({ error: 'Message too short.' }, { status: 400 });

  const categoryLabel = CATEGORIES[category];
  const replyTo = email?.trim() || undefined;

  await resend.emails.send({
    from: 'GarageCherries <no-reply@garagecherries.com>',
    to: 'contact-us@garagecherries.com',
    replyTo,
    subject: `[${categoryLabel}] User Feedback`,
    html: emailWrap(`
      <h1 style="font-size:18px;font-weight:800;color:#18181b;margin:0 0 16px">New Feedback Submission</h1>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <tr><td style="padding:6px 0;color:#71717a;width:100px">Category</td><td style="padding:6px 0;font-weight:600;color:#18181b">${categoryLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">From</td><td style="padding:6px 0;color:#18181b">${replyTo ?? 'Anonymous'}</td></tr>
      </table>
      <div style="background:#f4f4f5;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <p style="font-size:14px;color:#18181b;margin:0;white-space:pre-wrap">${message.trim()}</p>
      </div>
      <p style="color:#a1a1aa;font-size:12px;margin:0">${replyTo ? `Reply directly to this email to respond to the sender.` : `Sender did not provide an email address.`}</p>
    `),
  });

  return NextResponse.json({ ok: true });
}
