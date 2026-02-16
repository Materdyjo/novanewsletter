import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// GET all email lists
export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data: lists, error } = await admin
      .from("email_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching email lists:", error);
      return NextResponse.json(
        { error: "Failed to fetch email lists" },
        { status: 500 }
      );
    }

    // Get recipient counts for each list
    const listsWithCounts = await Promise.all(
      (lists || []).map(async (list) => {
        const { count } = await admin
          .from("email_list_recipients")
          .select("*", { count: "exact", head: true })
          .eq("email_list_id", list.id);

        return {
          ...list,
          recipient_count: count || 0,
        };
      })
    );

    return NextResponse.json({ lists: listsWithCounts });
  } catch (error) {
    console.error("Error in GET email-lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new email list
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: list, error } = await admin
      .from("email_lists")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      console.error("Error creating email list:", error);
      return NextResponse.json(
        { error: "Failed to create email list" },
        { status: 500 }
      );
    }

    return NextResponse.json({ list: { ...list, recipient_count: 0 } });
  } catch (error) {
    console.error("Error in POST email-lists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
