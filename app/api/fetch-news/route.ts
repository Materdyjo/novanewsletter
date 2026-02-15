import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabase } from "@/lib/supabase";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "application/rss+xml, application/xml, text/xml, */*",
  },
});

interface NewsItemRow {
  title: string;
  url: string;
  source_site: string;
  published_at: string;
  summary: string | null;
  original_snippet: string | null;
}

function toTitleCase(str: string): string {
  const isAllCaps = /^[A-Z\s\W]+$/.test(str) && str.length > 0;
  if (!isAllCaps) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function extractSourceSite(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

// Only seafood sources: Undercurrent News, Seafood Source, IntraFish (no BBC or other non-seafood)
const FEED_URLS: { url: string; label: string }[] = [
  // Undercurrent News - https://www.undercurrentnews.com/
  { url: "https://www.undercurrentnews.com/feed/", label: "Undercurrent News" },
  { url: "https://www.undercurrentnews.com/rss", label: "Undercurrent News" },
  { url: "https://www.undercurrentnews.com/rss.xml", label: "Undercurrent News" },
  { url: "https://undercurrentnews.com/feed/", label: "Undercurrent News" },
  // Seafood Source - https://www.seafoodsource.com/
  { url: "https://www.seafoodsource.com/feed/", label: "Seafood Source" },
  { url: "https://www.seafoodsource.com/rss", label: "Seafood Source" },
  { url: "https://www.seafoodsource.com/rss.xml", label: "Seafood Source" },
  { url: "https://seafoodsource.com/feed/", label: "Seafood Source" },
  // IntraFish - https://www.intrafish.com/
  { url: "https://www.intrafish.com/feed/", label: "IntraFish" },
  { url: "https://www.intrafish.com/rss", label: "IntraFish" },
  { url: "https://www.intrafish.com/rss.xml", label: "IntraFish" },
  { url: "https://intrafish.com/feed/", label: "IntraFish" },
];

async function fetchFeed(
  feedUrl: string
): Promise<{ items: NewsItemRow[]; worked: boolean }> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const latest = (feed.items || []).slice(0, 10);
    const items: NewsItemRow[] = [];

    for (const item of latest) {
      const link = item.link || (item as { guid?: string }).guid;
      if (!link || !item.title) continue;

      const title = toTitleCase(item.title);
      const sourceSite = extractSourceSite(link);
      items.push({
        title,
        url: link,
        source_site: sourceSite,
        published_at: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString(),
        summary:
          item.contentSnippet ||
          (item.content ? String(item.content).substring(0, 500) : null) ||
          null,
        original_snippet: item.contentSnippet || null,
      });
    }

    return { items, worked: items.length > 0 };
  } catch (err) {
    console.error(`Feed failed ${feedUrl}:`, err);
    return { items: [], worked: false };
  }
}

export async function POST(_request: NextRequest) {
  try {
    const allItems: NewsItemRow[] = [];
    const seenUrls = new Set<string>();

    for (const { url, label } of FEED_URLS) {
      const { items, worked } = await fetchFeed(url);
      if (worked) {
        for (const item of items) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allItems.push(item);
          }
        }
        console.log(`Fetched ${items.length} items from ${label} (${url})`);
      }
    }

    if (allItems.length === 0) {
      return NextResponse.json({
        success: true,
        totalFetched: 0,
        newItemsAdded: 0,
        message:
          "No RSS feeds could be read. Undercurrent News, Seafood Source and IntraFish may not offer public RSS; try adding more feed URLs in the code.",
      });
    }

    const urls = allItems.map((i) => i.url);
    const { data: existing } = await supabase
      .from("news_items")
      .select("url")
      .in("url", urls);

    const existingSet = new Set((existing || []).map((r) => r.url));
    const toInsert = allItems.filter((i) => !existingSet.has(i.url));
    const newCount = toInsert.length;

    if (toInsert.length > 0) {
      const { error } = await supabase.from("news_items").upsert(
        toInsert.map((item) => ({
          url: item.url,
          title: item.title,
          source_site: item.source_site,
          published_at: item.published_at,
          summary: item.summary,
          original_snippet: item.original_snippet,
        })),
        { onConflict: "url", ignoreDuplicates: false }
      );

      if (error) {
        console.error("Supabase upsert error:", error);
        return NextResponse.json(
          { error: "Failed to save articles to database", details: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      totalFetched: allItems.length,
      newItemsAdded: newCount,
      message: `Fetched ${allItems.length} items, added ${newCount} new items.`,
    });
  } catch (error) {
    console.error("fetch-news API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
