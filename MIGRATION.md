# SQLite to Supabase Migration

## Status: IN PROGRESS

## What's Done

1. **Installed Supabase packages**
   - `@supabase/supabase-js`
   - `@supabase/ssr`

2. **Created Supabase client files**
   - `lib/supabase/server.ts` - Server-side client
   - `lib/supabase/client.ts` - Browser client

3. **Created SQL schema** - `supabase/schema.sql`
   - Sessions table
   - Messages table
   - RLS policies (public access for demo)
   - Auto-update trigger for updated_at

4. **Rewrote database layer** - `lib/db/sessions.ts`
   - All functions now async
   - Uses lazy Supabase client initialization
   - Removed better-sqlite3 dependency

5. **Updated API routes** (all now use async/await)
   - `app/api/interview/start/route.ts`
   - `app/api/interview/message/route.ts`
   - `app/api/interview/complete/route.ts`
   - `app/api/interview/[sessionId]/route.ts`

6. **Removed old files**
   - Deleted `lib/db/setup.ts`
   - Uninstalled `better-sqlite3` and `@types/better-sqlite3`

7. **Updated `.env.example`** with Supabase vars

## What's Left

1. **Test build** - Run `npm run build` to verify
2. **Update README** - Document Supabase setup
3. **User setup required**:
   - Create Supabase project at https://supabase.com
   - Run `supabase/schema.sql` in SQL Editor
   - Add env vars to Vercel:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Redeploy

## Environment Variables Needed

```bash
# .env.local (local dev)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Commands to Resume

```bash
# Test build
npm run build

# If build passes, commit and push
git add -A
git commit -m "Migrate from SQLite to Supabase for Vercel compatibility"
git push
```

## Supabase Setup Steps

1. Go to https://supabase.com and create a new project
2. Go to SQL Editor and run contents of `supabase/schema.sql`
3. Go to Settings > API and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Add these to Vercel environment variables
5. Redeploy
