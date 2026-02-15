# RSS Feed Troubleshooting Guide

## Issue: No articles are being fetched (0 items)

The RSS feeds from Undercurrent News, Seafood Source, and IntraFish may not be publicly accessible or may require authentication.

## Solutions

### Option 1: Find the Actual RSS Feed URLs

1. **Visit each website directly:**
   - Go to `undercurrentnews.com`
   - Go to `seafoodsource.com`
   - Go to `intrafish.com`

2. **Look for RSS feed links:**
   - Check the footer
   - Look for "RSS" or "Feed" links
   - Check the sitemap
   - Try common patterns:
     - `/feed/`
     - `/rss`
     - `/rss.xml`
     - `/feed.xml`

3. **Test the URLs:**
   - Open the URL in your browser
   - You should see XML/RSS content
   - If you see HTML or an error, the URL is wrong

### Option 2: Use Alternative Seafood News Sources

Here are some alternative RSS feeds you can try:

```typescript
const rssFeeds = [
  "https://www.seafoodnews.com/rss",
  "https://www.fishupdate.com/rss",
  "https://www.fis.com/rss",
  // Add more as you find them
];
```

### Option 3: Test with Known Working Feeds

To verify the function works, test with these known working feeds:

```typescript
const rssFeeds = [
  "https://feeds.bbci.co.uk/news/rss.xml", // BBC News
  "https://rss.cnn.com/rss/edition.rss", // CNN
];
```

### Option 4: Check Supabase Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **fetch-news**
3. Click on **Logs**
4. Look for error messages that indicate:
   - Connection timeouts
   - 404 errors (feed not found)
   - 403 errors (access denied)
   - CORS issues

### Option 5: Manual Feed Testing

Test feeds manually using curl or your browser:

```bash
# Test a feed URL
curl https://www.undercurrentnews.com/feed/

# If it returns XML, the feed works
# If it returns HTML or an error, the URL is wrong
```

## Common Issues

1. **Paywall/Subscription Required**: Some sites require login to access RSS feeds
2. **CORS Restrictions**: Some sites block requests from external domains
3. **Rate Limiting**: Too many requests may be blocked
4. **Invalid URLs**: The RSS feed URL may have changed or never existed

## Next Steps

1. **Check the Edge Function logs** in Supabase to see specific errors
2. **Test feed URLs manually** in your browser
3. **Update the feed URLs** in `supabase/functions/fetch-news/index.ts` with working URLs
4. **Redeploy the function** after making changes

## Finding RSS Feeds

To find RSS feeds on any website:
1. View page source (Ctrl+U)
2. Search for "rss" or "feed"
3. Look for `<link rel="alternate" type="application/rss+xml">` tags
4. Check the sitemap.xml file

