# Deploying the fetch-news Edge Function

## Option 1: Deploy via Supabase Dashboard (Easiest - Recommended)

1. **Go to your Supabase Dashboard**:
   - Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Open Edge Functions**:
   - Click on **"Edge Functions"** in the left sidebar
   - Click **"Create a new function"** or **"New Function"**

3. **Create the function**:
   - **Function name**: `fetch-news`
   - **Copy the code** from `supabase/functions/fetch-news/index.ts`
   - Paste it into the editor

4. **Deploy**:
   - Click **"Deploy"** or **"Save"**

5. **Test the function**:
   - Once deployed, click **"Invoke"** to test it
   - Or use the function URL to call it via HTTP

## Option 2: Install Supabase CLI (For Advanced Users)

### Windows Installation Options:

#### Option A: Using Scoop (Recommended for Windows)
```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### Option B: Using Chocolatey
```powershell
choco install supabase
```

#### Option C: Download Binary Directly
1. Go to [https://github.com/supabase/cli/releases](https://github.com/supabase/cli/releases)
2. Download the Windows binary (`supabase_windows_amd64.zip`)
3. Extract and add to your PATH

### After Installing CLI:

1. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/[project-ref]`)

2. **Deploy the function**:
   ```bash
   supabase functions deploy fetch-news
   ```

## Option 3: Use Supabase CLI via npx (No Installation Required)

You can also use the CLI without installing it globally:

```powershell
npx supabase functions deploy fetch-news --project-ref your-project-ref
```

However, you'll need to authenticate first:
```powershell
npx supabase login
```

## Testing the Function

After deployment, you can test it by:

1. **Via Dashboard**: Click "Invoke" in the Edge Functions page
2. **Via HTTP**: 
   ```bash
   curl -X POST https://[your-project-ref].supabase.co/functions/v1/fetch-news \
     -H "Authorization: Bearer [your-anon-key]"
   ```
3. **Via Supabase Client** (in your Next.js app):
   ```typescript
   const { data, error } = await supabase.functions.invoke('fetch-news');
   ```

## Important Notes

- Make sure you've run the migration `002_add_url_unique_constraint.sql` first
- The function uses environment variables that are automatically available in Supabase:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- You can customize the RSS feeds by editing the `rssFeeds` array in the function code

