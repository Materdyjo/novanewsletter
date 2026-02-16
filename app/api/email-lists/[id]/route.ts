import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// GET recipients for a specific email list
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const admin = getSupabaseAdmin();

    // Get the list
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

    // Get recipients
    const { data: recipients, error: recipientsError } = await admin
      .from("email_list_recipients")
      .select("*")
      .eq("email_list_id", listId)
      .order("created_at", { ascending: false });

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      return NextResponse.json(
        { error: "Failed to fetch recipients" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      list,
      recipients: recipients || [],
    });
  } catch (error) {
    console.error("Error in GET email-lists/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE an email list
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const admin = getSupabaseAdmin();

    const { error } = await admin
      .from("email_lists")
      .delete()
      .eq("id", listId);

    if (error) {
      console.error("Error deleting email list:", error);
      return NextResponse.json(
        { error: "Failed to delete email list" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE email-lists/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
