# GarageCherries — Data Breach Incident Response Plan

*Internal operational reference, prepared to satisfy the "document an internal incident response process" item in `Legal-Review-Checklist.md`. This is not legal advice — have an attorney review before relying on it during an actual incident.*

---

## 1. Detection

A breach might first come to light through:
- A Supabase security alert or unusual database-access pattern
- A third-party report (security researcher, user, breach-monitoring service)
- A vendor (Supabase, Resend, Vercel) disclosing an incident on their end that affects us

## 2. Immediate Steps (Day 0–1)

- [ ] Confirm the breach is real — check Supabase logs/audit trail before acting on an unconfirmed report
- [ ] Contain: rotate affected credentials (`SUPABASE_SERVICE_ROLE_KEY`, other API keys), revoke compromised sessions
- [ ] Document what happened: what data, how many users, when it started, when it was discovered
- [ ] Do not discuss publicly until the scope is actually understood

## 3. Assessment (Day 1–5)

- [ ] Determine what data was actually exposed (emails, hashed passwords, and — once Stripe is wired — payment-related data)
- [ ] Determine the number of affected users
- [ ] Determine which states/countries affected users are in — notification requirements vary by jurisdiction
- [ ] Consult an attorney if the breach involves payment card data, or affects EU or California residents specifically (GDPR/CCPA have their own separate notification rules)

## 4. Notification (within 30 days of discovery)

- [ ] Draft a user notification: what happened, what data was involved, what we're doing about it, what the user should do (e.g., reset their password)
- [ ] Send to all affected users via Resend
- [ ] Notify the relevant state Attorney General or regulator if required by that state's law
- [ ] Post a notice on the Site if email isn't feasible for some affected users

## 5. Remediation

- [ ] Fix the root cause (patch the vulnerability, correct a misconfigured RLS policy, etc.)
- [ ] Force a password reset for affected accounts if credentials were involved
- [ ] Review and tighten related security controls to prevent recurrence

## 6. Post-Incident Review

- [ ] Internal review: what happened, what worked, what didn't
- [ ] Update this document if the process needs to change based on what was learned

## Key Contacts

| Resource | Contact |
|---|---|
| Supabase support | https://supabase.com/support |
| Resend support | https://resend.com/support |
| Vercel support | https://vercel.com/help |
| Attorney | Not yet retained — see `Legal-Review-Checklist.md` |

---

*Related: `Legal-Review-Checklist.md` item #4 (Data Breach Notification Policy), and the corresponding Privacy Policy section published at `/privacy`.*
