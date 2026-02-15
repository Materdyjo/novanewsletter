"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, ArrowLeft, Save, Bold, Italic, Underline } from "lucide-react";
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
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<{ anchorNode: Node; anchorOffset: number; focusNode: Node; focusOffset: number } | null>(null);

  useEffect(() => {
    fetchNewsletter();
  }, [newsletterId]);

  useEffect(() => {
    if (newsletter) {
      setSubject(newsletter.email_subject);
      if (editableRef.current) {
        editableRef.current.innerHTML = newsletter.email_body_html;
      }
    }
  }, [newsletter?.id, newsletter?.email_subject, newsletter?.email_body_html]);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editableRef.current?.contains(sel.anchorNode)) return;
      savedSelectionRef.current = {
        anchorNode: sel.anchorNode!,
        anchorOffset: sel.anchorOffset,
        focusNode: sel.focusNode!,
        focusOffset: sel.focusOffset,
      };
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

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

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editableRef.current?.contains(sel.anchorNode)) return;
    savedSelectionRef.current = {
      anchorNode: sel.anchorNode!,
      anchorOffset: sel.anchorOffset,
      focusNode: sel.focusNode!,
      focusOffset: sel.focusOffset,
    };
  };

  const restoreSelection = () => {
    const saved = savedSelectionRef.current;
    if (!saved || !editableRef.current) return false;
    try {
      const sel = window.getSelection();
      if (!sel) return false;
      const range = document.createRange();
      range.setStart(saved.anchorNode, saved.anchorOffset);
      range.setEnd(saved.focusNode, saved.focusOffset);
      sel.removeAllRanges();
      sel.addRange(range);
      editableRef.current.focus();
      return true;
    } catch {
      return false;
    }
  };

  const applyFormat = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    editableRef.current?.focus();
  };

  const handleSaveDraft = async () => {
    if (!newsletter || newsletter.status === "sent") return;
    const newHtml = editableRef.current?.innerHTML ?? newsletter.email_body_html;
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
      setSaveMessage("Zapisano.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setError("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!newsletter) return;
    // Save any unsaved edits first
    const newHtml = editableRef.current?.innerHTML ?? newsletter.email_body_html;
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
      const result = await sendNewsletter(newsletterId);

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Content</CardTitle>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-1 p-2 border rounded-lg bg-muted/50">
              <select
                className="h-8 rounded px-2 text-sm border bg-background"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) applyFormat("fontName", v);
                }}
                onMouseDown={saveSelection}
              >
                <option value="">Font</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Courier New">Courier New</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
              </select>
              <select
                className="h-8 rounded px-2 text-sm border bg-background"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) applyFormat("fontSize", v);
                }}
                onMouseDown={saveSelection}
              >
                <option value="">Size</option>
                <option value="1">Small</option>
                <option value="2">Normal</option>
                <option value="3">Medium</option>
                <option value="4">Large</option>
                <option value="5">X-Large</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => applyFormat("bold")}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => applyFormat("italic")}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => applyFormat("underline")}
              >
                <Underline className="h-4 w-4" />
              </Button>
              <input
                type="color"
                className="h-8 w-8 cursor-pointer border rounded p-0"
                defaultValue="#000000"
                onInput={(e) => applyFormat("foreColor", (e.target as HTMLInputElement).value)}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-white max-w-4xl mx-auto overflow-hidden">
            <style jsx global>{`
              .newsletter-editor {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                min-height: 320px;
                padding: 1rem;
                outline: none;
              }
              .newsletter-editor:focus {
                outline: none;
              }
              .newsletter-editor img {
                max-width: 100%;
                height: auto;
              }
              .newsletter-editor a {
                color: #2563eb;
                text-decoration: underline;
              }
              .newsletter-editor table {
                width: 100%;
                border-collapse: collapse;
              }
            `}</style>
            <div
              ref={editableRef}
              contentEditable={canEdit}
              suppressContentEditableWarning
              className="newsletter-editor"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
