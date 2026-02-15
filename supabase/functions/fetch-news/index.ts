// @ts-nocheck
// This file runs in Deno runtime, not Node.js
// TypeScript errors here are expected and can be ignored

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Parser from "https://esm.sh/rss-parser@3.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsItem {
  title: string;
  url: string;
  source_site: string;
  published_at: string;
  summary?: string;
  original_snippet?: string;
}

/**
 * Converts a string to Title Case if it's in all caps
 */
function toTitleCase(str: string): string {
  // Check if the string is in all caps (ignoring spaces and punctuation)
  const isAllCaps = /^[A-Z\s\W]+$/.test(str) && str.length > 0;
  
  if (!isAllCaps) {
    return str;
  }

  // Convert to title case
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Extracts the domain from a URL to use as source_site
 */
function extractSourceSite(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

/**
 * Fetches RSS feed and returns parsed items
 */
async function fetchRSSFeed(feedUrl: string): Promise<NewsItem[]> {
  const parser = new Parser({
    timeout: 10000, // 10 second timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  try {
    console.log(`Attempting to fetch: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);
    console.log(`Successfully fetched feed: ${feedUrl}, items: ${feed.items?.length || 0}`);
    
    const items: NewsItem[] = [];

    // Get the latest 10 items
    const latestItems = feed.items?.slice(0, 10) || [];

    for (const item of latestItems) {
      if (!item.link || !item.title) {
        console.log(`Skipping item - missing link or title`);
        continue;
      }

      const title = toTitleCase(item.title);
      const sourceSite = extractSourceSite(item.link);
      
      items.push({
        title,
        url: item.link,
        source_site: sourceSite,
        published_at: item.pubDate 
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString(),
        summary: item.contentSnippet || item.content?.substring(0, 500) || null,
        original_snippet: item.contentSnippet || null,
      });
    }

    console.log(`Processed ${items.length} items from ${feedUrl}`);
    return items;
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    console.error(`Error details:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Define RSS feed URLs for seafood industry news sources
    // Note: These sites may require subscription or have restricted RSS access
    // You may need to find the actual RSS feed URLs from each site
    const rssFeeds = [
      // Try common RSS feed patterns for these sites
      "https://www.undercurrentnews.com/feed/",
      "https://www.undercurrentnews.com/rss",
      "https://www.undercurrentnews.com/rss.xml",
      "https://www.seafoodsource.com/rss",
      "https://www.seafoodsource.com/feed",
      "https://www.seafoodsource.com/rss.xml",
      "https://www.intrafish.com/rss",
      "https://www.intrafish.com/feed",
      "https://www.intrafish.com/rss.xml",
      // Test with a known working RSS feed to verify the function works
      // "https://feeds.bbci.co.uk/news/rss.xml", // Uncomment to test
    ];

    let totalNewItems = 0;
    const allItems: NewsItem[] = [];

    // Fetch from all RSS feeds
    console.log(`Fetching from ${rssFeeds.length} RSS feeds...`);
    
    for (const feedUrl of rssFeeds) {
      console.log(`Fetching: ${feedUrl}`);
      const items = await fetchRSSFeed(feedUrl);
      allItems.push(...items);
      console.log(`Fetched ${items.length} items from ${feedUrl}`);
    }

    // Check which items already exist in the database
    const urls = allItems.map((item) => item.url);
    const { data: existingItems, error: selectError } = await supabaseClient
      .from("news_items")
      .select("url")
      .in("url", urls);

    if (selectError) {
      console.error("Error checking existing items:", selectError);
    }

    const existingUrls = new Set(
      existingItems?.map((item: { url: string }) => item.url) || []
    );

    // Filter out items that already exist
    const newItems = allItems.filter((item) => !existingUrls.has(item.url));
    totalNewItems = newItems.length;

    // Upsert all items (this will update existing ones and insert new ones)
    console.log(`Upserting ${allItems.length} items into database (${totalNewItems} new, ${allItems.length - totalNewItems} existing)...`);

    // Batch upsert for better performance
    const { error: upsertError } = await supabaseClient
      .from("news_items")
      .upsert(
        allItems.map((item) => ({
          url: item.url,
          title: item.title,
          source_site: item.source_site,
          published_at: item.published_at,
          summary: item.summary,
          original_snippet: item.original_snippet,
        })),
        {
          onConflict: "url",
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      console.error("Error upserting items:", upsertError);
      throw upsertError;
    }

    console.log(`Successfully added ${totalNewItems} new items`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFetched: allItems.length,
        newItemsAdded: totalNewItems,
        message: `Fetched ${allItems.length} items, added ${totalNewItems} new items`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in fetch-news function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

