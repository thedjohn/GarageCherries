const CHERRY_IMG = `<img src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="" width="28" height="28" style="display:inline-block;vertical-align:middle" />`;

export const emailHeader = `
  <div style="background:#18181b;padding:20px 24px;border-radius:12px 12px 0 0">
    <div style="display:flex;align-items:center;gap:8px">
      ${CHERRY_IMG}
      <span style="font-size:20px;font-weight:800;color:#fff">Garage<span style="color:#ef4444">Cherries</span></span>
    </div>
  </div>`;

export const emailFooterText = `GarageCherries &middot; <a href="https://www.garagecherries.com" style="color:#a1a1aa;">garagecherries.com</a>`;

export function emailWrap(body: string): string {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#18181b">
  ${emailHeader}
  <div style="background:#fff;border:1px solid #e4e4e7;border-top:none;padding:32px 24px;border-radius:0 0 12px 12px">
    ${body}
  </div>
</div>`;
}
