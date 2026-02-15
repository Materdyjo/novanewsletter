"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { sendNewsletter } from "@/app/actions/send-newsletter";

interface Newsletter {
  id: string;
  email_subject: string;
  email_body_html: string;
  status: string;
  created_at: string;
}

export default function PreviewNewsletterPage() {
  const params = useParams();
  const newsletterId = params.id as string;
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchNewsletter();
  }, [newsletterId]);

  const fetchNewsletter = async () => {
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to load newsletter");
        return;
      }
      const data = await res.json();
      setNewsletter(data);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to load newsletter");
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!newsletter) return;

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await sendNewsletter(newsletterId);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Update newsletter status in local state
        setNewsletter({ ...newsletter, status: "sent" });
      }
    } catch (error) {
      console.error("Error sending newsletter:", error);
      setError("Failed to send newsletter");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !newsletter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p>Newsletter not found</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-4">Preview Newsletter</h1>
          <p className="text-muted-foreground mt-2">
            Subject: {newsletter.email_subject}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Status: <span className="capitalize">{newsletter.status}</span>
          </p>
        </div>
        <Button
          onClick={handleSendNow}
          disabled={sending || newsletter.status === "sent"}
          size="lg"
          className="ml-4"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : newsletter.status === "sent" ? (
            <>
              <Send className="mr-2 h-4 w-4" />
              Already Sent
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Now
            </>
          )}
        </Button>
      </div>

      {success && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <p className="text-green-700 dark:text-green-300">
              Newsletter sent successfully!
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-white max-w-4xl mx-auto">
            <style jsx global>{`
              .newsletter-preview {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .newsletter-preview img {
                max-width: 100%;
                height: auto;
              }
              .newsletter-preview a {
                color: #2563eb;
                text-decoration: underline;
              }
              .newsletter-preview table {
                width: 100%;
                border-collapse: collapse;
              }
            `}</style>
            <div
              dangerouslySetInnerHTML={{ __html: newsletter.email_body_html }}
              className="newsletter-preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

