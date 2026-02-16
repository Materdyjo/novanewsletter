"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Upload,
  Trash2,
  Mail,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface EmailList {
  id: string;
  name: string;
  created_at: string;
  recipient_count: number;
}

export default function SelectEmailListPage() {
  const params = useParams();
  const router = useRouter();
  const newsletterId = params.id as string;
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/email-lists");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to load email lists");
        return;
      }
      const data = await res.json();
      setLists(data.lists || []);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to load email lists");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      setError("List name is required");
      return;
    }

    setCreatingList(true);
    setError(null);
    try {
      const res = await fetch("/api/email-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to create list");
        return;
      }

      const data = await res.json();
      setLists([data.list, ...lists]);
      setNewListName("");
      setShowNewListDialog(false);
      setSelectedListId(data.list.id);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to create list");
    } finally {
      setCreatingList(false);
    }
  };

  const handleUploadExcel = async (listId: string) => {
    if (!uploadFile) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const res = await fetch(`/api/email-lists/${listId}/upload-excel`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to upload file");
        return;
      }

      const data = await res.json();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setUploadFile(null);
      setShowUploadDialog(null);
      // Refresh lists to update recipient counts
      fetchLists();
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSendToSelectedList = async () => {
    if (!selectedListId) {
      setError("Please select an email list");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/newsletters/${newsletterId}/send-to-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_list_id: selectedListId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to send newsletter");
        return;
      }

      // Redirect back to preview page
      router.push(`/newsletters/${newsletterId}/preview`);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to send newsletter");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list?")) {
      return;
    }

    try {
      const res = await fetch(`/api/email-lists/${listId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to delete list");
        return;
      }

      setLists(lists.filter((list) => list.id !== listId));
      if (selectedListId === listId) {
        setSelectedListId(null);
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to delete list");
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/newsletters/${newsletterId}/preview`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Preview
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mt-4">Choose Email List</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select an email list to send your newsletter to, or create a new one
        </p>
      </div>

      {success && (
        <Card className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="py-2">
            <p className="text-green-700 dark:text-green-300 text-sm">
              Emails uploaded successfully!
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

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Email Lists</h2>
        <Button
          onClick={() => setShowNewListDialog(true)}
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New List
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No email lists yet. Create your first list to get started.
            </p>
            <Button onClick={() => setShowNewListDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card
              key={list.id}
              className={`cursor-pointer transition-all ${
                selectedListId === list.id
                  ? "border-primary ring-2 ring-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedListId(list.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{list.name}</CardTitle>
                {selectedListId === list.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    {list.recipient_count} recipient
                    {list.recipient_count !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUploadDialog(list.id);
                      }}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteList(list.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedListId && (
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSendToSelectedList}
            disabled={sending}
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Newsletter to Selected List
              </>
            )}
          </Button>
        </div>
      )}

      {/* New List Dialog */}
      {showNewListDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create New Email List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  List Name
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Subscribers, Customers, etc."
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateList();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewListDialog(false);
                    setNewListName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateList}
                  disabled={creatingList || !newListName.trim()}
                >
                  {creatingList ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Excel Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Upload Excel File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Excel or CSV file
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Note:</strong> Only the first column will be read for email addresses.
                  Make sure your emails are in the first column of the file.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(null);
                    setUploadFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUploadExcel(showUploadDialog)}
                  disabled={uploading || !uploadFile}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
