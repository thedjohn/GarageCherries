-- Drop the orphaned inquiries table. POST /api/inquire (the only writer)
-- has had no live caller since "Message Seller" moved to the
-- conversations/messages system — confirmed via repo-wide search and a
-- live production check (0 rows). Dealer-facing consumers that used to
-- read this table (GET /api/dealer/metrics, POST /api/email/dealer-report)
-- were rewired to read conversations instead on 2026-07-14. No FK
-- references point at this table. Run this in the Supabase SQL editor
-- (Dashboard > SQL Editor).

DROP TABLE IF EXISTS inquiries;
