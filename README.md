# MRC ERP

Side-by-side ERP rebuild for the existing Google Apps Script work order system.

## Stack

- Next.js
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage

## Local Setup

Copy `.env.example` to `.env.local` and fill in the Supabase values.

```bash
npm install
npm run dev
```

## Safety

This app is separate from the existing Apps Script system. Do not connect production Sheets or Drive folders until staging migration is approved.

