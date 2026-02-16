import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { supabase } from "@/lib/supabase";
import * as cheerio from "cheerio";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
  },
  customFields: {
    item: ['content:encoded', 'description', 'summary'],
  },
  // Try to handle malformed XML better and support Atom feeds
  xml2js: {
    trim: true,
    normalize: true,
    normalizeTags: false,
    attrkey: '_attr',
    charkey: '_text',
    explicitArray: false,
    mergeAttrs: true,
  },
  // Enable Atom feed support
  defaultRSS: 2.0,
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

// Only seafood sources: Undercurrent News, Seafood Source, IntraFish, Portal Spożywczy
const FEED_URLS: { url: string; label: string }[] = [
  // Undercurrent News - https://www.undercurrentnews.com/
  { url: "https://www.undercurrentnews.com/feed/", label: "Undercurrent News" },
  { url: "https://www.undercurrentnews.com/rss", label: "Undercurrent News" },
  // IntraFish - https://www.intrafish.com/
  // Try alternative feed URLs
  { url: "https://intrafish.com/feed", label: "IntraFish" },
  { url: "https://www.intrafish.com/rss_fisheries", label: "IntraFish" },
  // Portal Spożywczy - Ryby i owoce morza - https://www.portalspozywczy.pl/ryby/
  { url: "https://www.portalspozywczy.pl/rss/ryby.xml", label: "Portal Spożywczy" },
  // Seafood Source - Note: These feeds return 403 (Forbidden), likely require authentication
  // Keeping commented out for reference - may need alternative approach
  // { url: "https://www.seafoodsource.com/feed/", label: "Seafood Source" },
  // { url: "https://www.seafoodsource.com/rss", label: "Seafood Source" },
];

async function fetchFeed(
  feedUrl: string
): Promise<{ items: NewsItemRow[]; worked: boolean }> {
  try {
    // Try to fetch and parse the feed
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
          item.description ||
          null,
        original_snippet: item.contentSnippet || item.description || null,
      });
    }

    return { items, worked: items.length > 0 };
  } catch (err: any) {
    // More detailed error logging
    const errorMsg = err?.message || String(err);
    const statusCode = err?.statusCode || err?.status;
    
    // Handle XML parsing errors more gracefully
    if (errorMsg.includes("Invalid character in entity name") || 
        errorMsg.includes("XML") || 
        errorMsg.includes("parse")) {
      console.error(`Feed failed ${feedUrl}: XML parsing error - malformed feed`);
    } else if (statusCode === 403 || statusCode === 404 || statusCode === 429) {
      console.error(`Feed failed ${feedUrl}: Status ${statusCode}`);
    } else {
      console.error(`Feed failed ${feedUrl}:`, errorMsg.substring(0, 200));
    }
    return { items: [], worked: false };
  }
}

// Web scraping function for Seafood Source (RSS feeds are blocked)
async function scrapeSeafoodSource(): Promise<{ items: NewsItemRow[]; worked: boolean }> {
  try {
    const response = await fetch("https://www.seafoodsource.com/news", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`Seafood Source scraping failed: Status ${response.status}`);
      return { items: [], worked: false };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: NewsItemRow[] = [];
    const seenUrls = new Set<string>();

    // Try multiple selectors to find articles
    const selectors = [
      'article a[href*="/news/"]',
      '.article-item a[href*="/news/"]',
      '.news-item a[href*="/news/"]',
      'a[href*="/news/"][href*="/aquaculture/"]',
      'a[href*="/news/"][href*="/supply-trade/"]',
      'a[href*="/news/"][href*="/business-finance/"]',
    ];

    for (const selector of selectors) {
      $(selector).slice(0, 15).each((_, element) => {
        const $link = $(element);
        const href = $link.attr("href");
        if (!href || seenUrls.has(href)) return;

        // Find the title - could be in the link text or nearby elements
        let title = $link.text().trim();
        if (!title || title.length < 10) {
          title = $link.closest("article, .article-item, .news-item")
            .find("h2, h3, .title, .headline").first().text().trim() || title;
        }

        // Find summary/excerpt - try multiple approaches
        const $parent = $link.closest("article, .article-item, .news-item, .card, .post");
        let summary = $parent.find("p, .summary, .excerpt, .description, .snippet").first().text().trim();
        
        // If no summary found, try finding next sibling paragraph
        if (!summary || summary.length < 20) {
          summary = $link.parent().next("p").text().trim() || 
                   $link.closest("div").find("p").not(":has(a)").first().text().trim();
        }
        
        // Clean up summary
        if (summary) {
          summary = summary.replace(/\s+/g, " ").trim().substring(0, 300);
        }

        if (title && title.length > 10) {
          const fullUrl = href.startsWith("http") ? href : `https://www.seafoodsource.com${href}`;
          seenUrls.add(href);
          items.push({
            title: toTitleCase(title),
            url: fullUrl,
            source_site: "seafoodsource.com",
            published_at: new Date().toISOString(),
            summary: summary || `Read more about ${title.substring(0, 50)}...`,
            original_snippet: summary || null,
          });
        }
      });

      if (items.length >= 10) break;
    }

    return { items: items.slice(0, 10), worked: items.length > 0 };
  } catch (err: any) {
    console.error(`Seafood Source scraping error:`, err?.message?.substring(0, 200));
    return { items: [], worked: false };
  }
}

// Web scraping function for IntraFish (RSS feeds are failing)
async function scrapeIntraFish(): Promise<{ items: NewsItemRow[]; worked: boolean }> {
  try {
    const response = await fetch("https://www.intrafish.com/latest", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.error(`IntraFish scraping failed: Status ${response.status}`);
      return { items: [], worked: false };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: NewsItemRow[] = [];
    const seenUrls = new Set<string>();

    // Try multiple selectors to find articles
    const selectors = [
      'article a[href*="/"]',
      '.article-item a[href*="/"]',
      '.news-item a[href*="/"]',
      '.post a[href*="/"]',
      'a[href*="/salmon/"]',
      'a[href*="/aquaculture/"]',
      'a[href*="/fisheries/"]',
    ];

    for (const selector of selectors) {
      $(selector).slice(0, 15).each((_, element) => {
        const $link = $(element);
        const href = $link.attr("href");
        if (!href || seenUrls.has(href)) return;
        
        // Skip external links that aren't from intrafish.com
        if (href.startsWith("http") && !href.includes("intrafish.com")) return;

        // Find the title
        let title = $link.text().trim();
        if (!title || title.length < 10) {
          title = $link.closest("article, .article-item, .news-item, .post")
            .find("h1, h2, h3, .title, .headline").first().text().trim() || title;
        }

        // Find summary/excerpt
        const $parent = $link.closest("article, .article-item, .news-item, .post");
        let summary = $parent.find("p, .summary, .excerpt, .description").first().text().trim();
        
        if (!summary || summary.length < 20) {
          summary = $link.parent().next("p").text().trim() || 
                   $link.closest("div").find("p").not(":has(a)").first().text().trim();
        }
        
        if (summary) {
          summary = summary.replace(/\s+/g, " ").trim().substring(0, 300);
        }

        if (title && title.length > 10) {
          const fullUrl = href.startsWith("http") ? href : `https://www.intrafish.com${href}`;
          seenUrls.add(href);
          items.push({
            title: toTitleCase(title),
            url: fullUrl,
            source_site: "intrafish.com",
            published_at: new Date().toISOString(),
            summary: summary || `Read more about ${title.substring(0, 50)}...`,
            original_snippet: summary || null,
          });
        }
      });

      if (items.length >= 10) break;
    }

    return { items: items.slice(0, 10), worked: items.length > 0 };
  } catch (err: any) {
    console.error(`IntraFish scraping error:`, err?.message?.substring(0, 200));
    return { items: [], worked: false };
  }
}

export async function POST(_request: NextRequest) {
  try {
    const allItems: NewsItemRow[] = [];
    const seenUrls = new Set<string>();
    const sourceStats: Record<string, number> = {};

    for (const { url, label } of FEED_URLS) {
      const { items, worked } = await fetchFeed(url);
      if (worked) {
        for (const item of items) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allItems.push(item);
            // Track articles by source
            const source = item.source_site;
            sourceStats[source] = (sourceStats[source] || 0) + 1;
          }
        }
        console.log(`✓ Fetched ${items.length} items from ${label} (${url})`);
      } else {
        console.log(`✗ Failed to fetch from ${label} (${url})`);
      }
    }

    // Try web scraping for Seafood Source (RSS feeds are blocked)
    const { items: seafoodItems, worked: seafoodWorked } = await scrapeSeafoodSource();
    if (seafoodWorked) {
      for (const item of seafoodItems) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allItems.push(item);
          const source = item.source_site;
          sourceStats[source] = (sourceStats[source] || 0) + 1;
        }
      }
      console.log(`✓ Scraped ${seafoodItems.length} items from Seafood Source`);
    } else {
      console.log(`✗ Failed to scrape Seafood Source`);
    }

    // Try web scraping for IntraFish (RSS feeds are failing)
    const { items: intrafishItems, worked: intrafishWorked } = await scrapeIntraFish();
    if (intrafishWorked) {
      for (const item of intrafishItems) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allItems.push(item);
          const source = item.source_site;
          sourceStats[source] = (sourceStats[source] || 0) + 1;
        }
      }
      console.log(`✓ Scraped ${intrafishItems.length} items from IntraFish`);
    } else {
      console.log(`✗ Failed to scrape IntraFish`);
    }

    // Log summary by source
    console.log("Articles fetched by source:", sourceStats);

    if (allItems.length === 0) {
      return NextResponse.json({
        success: true,
        totalFetched: 0,
        newItemsAdded: 0,
        message:
          "No RSS feeds could be read. Undercurrent News, Seafood Source, IntraFish and Portal Spożywczy may not offer public RSS; try adding more feed URLs in the code.",
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

    const sourceBreakdown = Object.entries(sourceStats)
      .map(([source, count]) => `${source}: ${count}`)
      .join(", ");

    return NextResponse.json({
      success: true,
      totalFetched: allItems.length,
      newItemsAdded: newCount,
      message: `Fetched ${allItems.length} items, added ${newCount} new items. Sources: ${sourceBreakdown || "none"}`,
      sourceStats,
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
