import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// POST add recipients to an email list
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const body = await request.json();
    const { emails } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Emails array is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails
      .map((email: string) => email.trim().toLowerCase())
      .filter((email: string) => emailRegex.test(email));

    if (validEmails.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses provided" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Check if list exists
    const { data: list, error: listError } = await admin
      .from("email_lists")
      .select("*")
      .eq("id", listId)
      .single();

    if (listError || !list) {
      return NextResponse.json(
        { error: "Email list not found" },
        { status: 404 }
      );
    }

    // Insert recipients (ignore duplicates due to UNIQUE constraint)
    const recipients = validEmails.map((email: string) => ({
      email_list_id: listId,
      email,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("email_list_recipients")
      .upsert(recipients, {
        onConflict: "email_list_id,email",
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error("Error adding recipients:", insertError);
      return NextResponse.json(
        { error: "Failed to add recipients" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      added: inserted?.length || 0,
      total: validEmails.length,
    });
  } catch (error) {
    console.error("Error in POST email-lists/[id]/recipients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a recipient from an email list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    const { error } = await admin
      .from("email_list_recipients")
      .delete()
      .eq("email_list_id", listId)
      .eq("email", email);

    if (error) {
      console.error("Error deleting recipient:", error);
      return NextResponse.json(
        { error: "Failed to delete recipient" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE email-lists/[id]/recipients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
