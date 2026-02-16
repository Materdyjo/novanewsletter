"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Send,
  ArrowLeft,
  Save,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { sendNewsletter } from "@/app/actions/send-newsletter";
import { useRouter } from "next/navigation";
import { EmailEditorPro } from "@/components/email-editor-pro/email-editor-pro";

interface Newsletter {
  id: string;
  email_subject: string;
  email_body_html: string;
  status: string;
  created_at: string;
}

export default function PreviewNewsletterPage() {
  const params = useParams();
  const router = useRouter();
  const newsletterId = params.id as string;
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editorHtml, setEditorHtml] = useState("");
  const [htmlSizeKB, setHtmlSizeKB] = useState<number>(0);
  const editorHtmlRef = useRef(editorHtml);
  useEffect(() => {
    editorHtmlRef.current = editorHtml;
    // Track HTML size for Gmail clipping warnings
    if (editorHtml) {
      const sizeKB = new Blob([editorHtml]).size / 1024;
      setHtmlSizeKB(sizeKB);
    } else {
      setHtmlSizeKB(0);
    }
  }, [editorHtml]);

  useEffect(() => {
    fetchNewsletter();
  }, [newsletterId]);

  useEffect(() => {
    if (newsletter) {
      setSubject(newsletter.email_subject);
      setEditorHtml(newsletter.email_body_html);
    }
  }, [newsletter?.id, newsletter?.email_subject, newsletter?.email_body_html]);


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


  const handleSaveDraft = async () => {
    if (!newsletter || newsletter.status === "sent") return;
    // Flush any focused contentEditable (header/text) so its content is saved
    if (typeof document !== "undefined" && document.activeElement?.getAttribute?.("contenteditable") === "true") {
      (document.activeElement as HTMLElement).blur();
      await new Promise((r) => setTimeout(r, 350));
    }
    // Use ref to get latest HTML (includes any just-flushed content)
    const newHtml = editorHtmlRef.current || editorHtml || newsletter.email_body_html;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_subject: subject.trim() || newsletter.email_subject,
          email_body_html: newHtml,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to save");
        return;
      }
      const data = await res.json();
      setNewsletter(data);
      // Verify what was saved
      const savedHtmlLength = data.email_body_html?.length || 0;
      const savedHtmlSizeKB = (savedHtmlLength / 1024).toFixed(1);
      setSaveMessage(`Zapisano. (${savedHtmlSizeKB}KB)`);
      setTimeout(() => setSaveMessage(null), 4000);
      
      // Also update editorHtml state to match what was saved
      if (data.email_body_html) {
        setEditorHtml(data.email_body_html);
      }
    } catch (err) {
      setError("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!newsletter) return;
    // Flush any focused contentEditable (header/text) so its content is saved before we read HTML
    if (typeof document !== "undefined" && document.activeElement?.getAttribute?.("contenteditable") === "true") {
      (document.activeElement as HTMLElement).blur();
      await new Promise((r) => setTimeout(r, 350));
    }
    const newHtml = editorHtmlRef.current || editorHtml || newsletter.email_body_html;
    const newSubject = subject.trim() || newsletter.email_subject;
    if (newHtml !== newsletter.email_body_html || newSubject !== newsletter.email_subject) {
      await fetch(`/api/newsletters/${newsletterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_subject: newSubject, email_body_html: newHtml }),
      });
      setNewsletter({ ...newsletter, email_subject: newSubject, email_body_html: newHtml });
    }

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await sendNewsletter(newsletterId, newHtml);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setNewsletter((prev) => (prev ? { ...prev, status: "sent" } : null));
      }
    } catch (err) {
      console.error("Error sending newsletter:", err);
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

  const canEdit = newsletter.status !== "sent";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-4">Preview Newsletter</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Status: <span className="capitalize">{newsletter.status}</span>
            {htmlSizeKB > 0 && (
              <span className="ml-3">
                Size: {htmlSizeKB.toFixed(1)}KB
                {htmlSizeKB > 100 && (
                  <span className="text-orange-600 ml-1" title="Gmail hides the rest of emails over ~102KB and shows «Pokaż całą wiadomość». Use image URLs instead of uploaded images to reduce size.">⚠️ Gmail may clip</span>
                )}
                {htmlSizeKB > 50 && editorHtml.includes('data:image') && (
                  <span className="text-orange-600 ml-1" title="Images were pasted/uploaded and are embedded in the email, which makes it large. Add images by URL (link) to keep the email small and avoid Gmail clipping.">⚠️ Contains base64 images</span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              onClick={handleSaveDraft}
              disabled={saving}
              variant="outline"
              size="lg"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft
            </Button>
          )}
          {newsletter.status !== "sent" && (
            <Button
              onClick={() => router.push(`/newsletters/${newsletterId}/select-list`)}
              variant="outline"
              size="lg"
            >
              <Mail className="mr-2 h-4 w-4" />
              Choose Email List
            </Button>
          )}
          <Button
            onClick={handleSendNow}
            disabled={sending || newsletter.status === "sent"}
            size="lg"
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
      </div>

      {saveMessage && (
        <Card className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="py-2">
            <p className="text-green-700 dark:text-green-300 text-sm">{saveMessage}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <p className="text-green-700 dark:text-green-300">Newsletter sent successfully!</p>
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!canEdit}
            className="w-full max-w-2xl px-3 py-2 border rounded-md bg-background text-foreground disabled:opacity-50"
            placeholder="Email subject"
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Email Content</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[800px] overflow-hidden">
            <EmailEditorPro
              initialHtml={newsletter.email_body_html}
              onContentChange={setEditorHtml}
              canEdit={canEdit}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
