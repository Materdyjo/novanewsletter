"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source_site: string;
  published_at: string;
  summary: string | null;
  original_snippet: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetchNewsItems();
  }, []);

  // Only show articles from our three seafood sources (no BBC or other sites)
  const SEAFOOD_SOURCES = ["undercurrentnews.com", "seafoodsource.com", "intrafish.com"];

  const fetchNewsItems = async () => {
    try {
      const { data, error } = await supabase
        .from("news_items")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) {
        console.error("Error fetching news items:", error);
        return;
      }

      const filtered = (data || []).filter((item: NewsItem) =>
        SEAFOOD_SOURCES.some(
          (source) =>
            item.source_site?.toLowerCase().includes(source)
        )
      );
      setNewsItems(filtered);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleFetchNews = async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/fetch-news", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error || "Failed to fetch news"}`);
        return;
      }

      alert(`Success! Fetched ${data.totalFetched} items, added ${data.newItemsAdded} new items.`);
      // Refresh the articles list
      await fetchNewsItems();
    } catch (error) {
      console.error("Error fetching news:", error);
      alert("Failed to fetch news. Please try again.");
    } finally {
      setFetching(false);
    }
  };

  const handleDraftNewsletter = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one article");
      return;
    }

    setDrafting(true);
    try {
      const response = await fetch("/api/draft-newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newsItemIds: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create draft newsletter");
      }

      // Navigate to preview page
      router.push(`/newsletters/${data.newsletterId}/preview`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error creating draft newsletter:", error);
      alert(error instanceof Error ? error.message : "Failed to create draft newsletter");
    } finally {
      setDrafting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">News Dashboard</h1>
          <p className="text-muted-foreground">
            Select articles to create a newsletter draft
          </p>
        </div>
        <Button
          onClick={handleFetchNews}
          disabled={fetching}
          variant="outline"
        >
          {fetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Fetch News
            </>
          )}
        </Button>
      </div>

      {newsItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No news items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsItems.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedIds.has(item.id) ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => toggleSelection(item.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2">
                      {item.source_site}
                    </Badge>
                    <CardTitle className="text-lg line-clamp-2">
                      {item.title}
                    </CardTitle>
                  </div>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelection(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.summary || item.original_snippet || "No snippet available"}
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                  onClick={(e) => e.stopPropagation()}
                >
                  Read more →
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Draft Newsletter Button */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            onClick={handleDraftNewsletter}
            disabled={drafting}
            className="shadow-lg"
          >
            {drafting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Draft...
              </>
            ) : (
              `Draft Newsletter (${selectedIds.size})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

