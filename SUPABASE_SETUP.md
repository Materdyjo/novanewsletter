# Supabase Setup Guide

## Step 1: Create a Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click **"New Project"** to create a new project
4. Fill in your project details:
   - **Name**: Choose a name for your project (e.g., "sasina")
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose the region closest to you
   - Click **"Create new project"**

## Step 2: Get Your Supabase Credentials

Once your project is created (this may take a few minutes):

1. In your Supabase dashboard, click the **⚙️ Settings** icon in the left sidebar
2. Click **"API"** in the settings menu
3. You'll see two important values:

### Project URL
- Located under **"Project URL"**
- Looks like: `https://xxxxxxxxxxxxx.supabase.co`
- Copy this entire URL

### API Keys
- Located under **"Project API keys"**
- You'll see two keys:
  - **`anon` `public`** - Use this one for client-side code ✅
  - **`service_role` `secret`** - Never expose this in client-side code ❌
- Copy the **`anon` `public`** key (it's a long string starting with `eyJ...`)

## Step 3: Create Your `.env.local` File

1. In your project root directory (`d:\sasina`), create a file named `.env.local`
2. Add your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important Notes:**
- Replace the placeholder values with your actual credentials
- Never commit `.env.local` to git (it's already in `.gitignore`)
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser

## Step 4: Run the Database Migration

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire contents of that file
5. Paste it into the SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter`)
7. You should see a success message and the tables will be created

## Step 5: Verify Your Setup

1. Restart your Next.js dev server if it's running:
   ```bash
   npm run dev
   ```

2. Check that your Supabase client is working by looking for any errors in the console

## Troubleshooting

- **"Missing Supabase environment variables" error**: Make sure your `.env.local` file exists and has the correct variable names
- **Connection errors**: Verify your Project URL and API key are correct
- **RLS policy errors**: Make sure you've run the migration file in the SQL Editor

