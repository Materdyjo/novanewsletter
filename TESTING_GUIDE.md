# Testing Guide for Sasina Newsletter SaaS

This guide will help you test all the features of your newsletter application.

## Prerequisites

1. **Environment Variables Setup**
   - Make sure your `.env.local` file has all required variables:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     GEMINI_API_KEY=your_gemini_api_key
     RESEND_API_KEY=your_resend_api_key (optional for testing)
     RESEND_FROM_EMAIL=masterlork6@gmail.com
     DEFAULT_USER_EMAIL=mateuszignacik00@gmail.com
     ```

2. **Database Setup**
   - Make sure you've run both migration files in Supabase SQL Editor:
     - `001_initial_schema.sql`
     - `002_add_url_unique_constraint.sql`

## Step 1: Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 2: Test RSS Feed Fetching

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Find the `fetch-news` function
4. Click **"Invoke"** or **"Test"**
5. Check the logs to see:
   - How many feeds were fetched
   - How many new items were added
   - Any errors

### Option B: Using HTTP Request

```bash
curl -X POST https://dtvwhldnkvfkepubzkbp.supabase.co/functions/v1/fetch-news \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Expected Result:
- Function should fetch articles from:
  - Undercurrent News
  - Seafood Source
  - IntraFish
- Articles should be saved to the `news_items` table
- Response should show: `{ "success": true, "totalFetched": X, "newItemsAdded": Y }`

### Verify in Supabase:
1. Go to **Table Editor** in Supabase Dashboard
2. Open the `news_items` table
3. You should see articles with titles, URLs, and source_site

## Step 3: Test the Dashboard

1. Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. You should see:
   - A grid of news articles
   - Each card showing:
     - Source badge (e.g., "undercurrentnews.com")
     - Article title
     - Snippet/summary
     - Checkbox for selection
3. **Test Selection:**
   - Click on article cards to select them
   - Selected cards should have a blue ring border
   - The "Draft Newsletter" button should appear at the bottom right
   - The button should show the count of selected articles

## Step 4: Test Newsletter Creation

1. **Select Articles:**
   - Select 3-5 articles from the dashboard
   - Click the floating **"Draft Newsletter"** button

2. **Wait for Generation:**
   - You'll be redirected to the preview page
   - Gemini AI will generate the newsletter content
   - This may take 10-30 seconds

3. **Verify Preview Page:**
   - You should see:
     - Newsletter subject line
     - Status: "draft"
     - Full HTML preview of the newsletter
     - Articles grouped by topic (Aquaculture, Market Prices, etc.)
     - 2-sentence summaries for each article

4. **Check Database:**
   - Go to Supabase → Table Editor → `newsletters` table
   - You should see a new newsletter record
   - Check `newsletter_items` table to see linked articles

## Step 5: Test Email Sending

### Prerequisites:
- You need a Resend API key
- The `RESEND_API_KEY` must be set in `.env.local`

### Steps:

1. **On the Preview Page:**
   - Review the newsletter preview
   - Click the **"Send Now"** button

2. **Expected Behavior:**
   - Button shows "Sending..." with spinner
   - Success message appears: "Newsletter sent successfully!"
   - Newsletter status changes to "sent"
   - Button becomes disabled with "Already Sent"

3. **Check Email:**
   - Check `mateuszignacik00@gmail.com` inbox
   - You should receive the newsletter email
   - Email should be from `masterlork6@gmail.com`

4. **Verify in Database:**
   - Check `newsletters` table
   - Status should be updated to "sent"

## Troubleshooting

### Issue: No articles showing in dashboard

**Solutions:**
- Make sure you've run the `fetch-news` Edge Function
- Check Supabase `news_items` table has data
- Refresh the dashboard page
- Check browser console for errors

### Issue: Newsletter generation fails

**Solutions:**
- Verify `GEMINI_API_KEY` is set correctly
- Check API route logs in terminal
- Verify you have credits/quota in Google AI Studio
- Check that articles were selected before creating draft

### Issue: Email sending fails

**Solutions:**
- Verify `RESEND_API_KEY` is set
- Check Resend dashboard for API key status
- Verify domain is verified in Resend (if required)
- Check server logs for error messages
- Try using a verified domain email instead of Gmail

### Issue: RSS feeds not fetching

**Solutions:**
- Verify RSS feed URLs are correct
- Test feed URLs directly in browser
- Check Edge Function logs in Supabase
- Some sites may block automated requests

## Testing Checklist

- [ ] Development server starts without errors
- [ ] Dashboard loads and shows articles
- [ ] Articles can be selected/deselected
- [ ] Draft Newsletter button appears when articles are selected
- [ ] Newsletter is created successfully
- [ ] Preview page shows generated newsletter
- [ ] Newsletter HTML is properly formatted
- [ ] Articles are grouped by topic
- [ ] Email sends successfully (if Resend is configured)
- [ ] Newsletter status updates to "sent"
- [ ] Email is received at destination address

## Quick Test Commands

```bash
# Start dev server
npm run dev

# Check environment variables (PowerShell)
Get-Content .env.local

# Test API route locally
curl http://localhost:3000/api/draft-newsletter \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"newsItemIds": ["article-id-1", "article-id-2"]}'
```

## Next Steps After Testing

1. **Set up scheduled fetching:**
   - Use Supabase Cron Jobs or external scheduler
   - Run `fetch-news` function daily/hourly

2. **Add authentication:**
   - Replace placeholder `user_id` with actual auth
   - Use Supabase Auth for user management

3. **Customize RSS feeds:**
   - Update feed URLs if needed
   - Add more sources if desired

4. **Production deployment:**
   - Deploy to Vercel or similar
   - Set up production environment variables
   - Configure domain for Resend

