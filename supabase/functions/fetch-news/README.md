# fetch-news Edge Function

This Supabase Edge Function fetches news items from RSS feeds and upserts them into the `news_items` table.

## Features

- Fetches the latest 10 items from multiple RSS feeds
- Converts all-caps titles to Title Case
- Upserts items into the database, avoiding duplicates based on the `url` field
- Logs the number of new items added

## Configuration

Edit the `rssFeeds` array in `index.ts` to add your RSS feed URLs:

```typescript
const rssFeeds = [
  "https://rss.cnn.com/rss/edition.rss",
  "https://feeds.bbci.co.uk/news/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  // Add more RSS feed URLs here
];
```

## Deployment

To deploy this function to Supabase:

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Deploy the function:
   ```bash
   supabase functions deploy fetch-news
   ```

## Invocation

You can invoke this function via:

- **HTTP Request**: `POST https://[project-ref].supabase.co/functions/v1/fetch-news`
- **Supabase Dashboard**: Edge Functions → fetch-news → Invoke
- **Cron Job**: Set up a scheduled trigger in Supabase to run this function periodically

## Environment Variables

The function uses these environment variables (automatically available in Supabase):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (has elevated permissions)

## Response

```json
{
  "success": true,
  "totalFetched": 30,
  "newItemsAdded": 15,
  "message": "Fetched 30 items, added 15 new items"
}
```

