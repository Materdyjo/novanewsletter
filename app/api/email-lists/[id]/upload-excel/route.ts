import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import * as XLSX from "xlsx";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type (also check file extension as CSV MIME types can vary)
    const fileName = file.name.toLowerCase();
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
      "application/csv", // .csv (alternative MIME type)
      "text/comma-separated-values", // .csv (alternative MIME type)
    ];

    const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
    const hasValidType = validTypes.includes(file.type) || file.type === "";

    if (!hasValidExtension && !hasValidType) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file." },
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

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON array format (header: 1 means first row is data, not headers)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Extract emails from the first column only
    const emails: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const row of data) {
      if (Array.isArray(row) && row.length > 0) {
        // Only check the first column (index 0)
        const firstCell = row[0];
        if (typeof firstCell === "string") {
          const trimmed = firstCell.trim().toLowerCase();
          if (emailRegex.test(trimmed)) {
            emails.push(trimmed);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueEmails = Array.from(new Set(emails));

    if (uniqueEmails.length === 0) {
      return NextResponse.json(
        { error: "No valid email addresses found in the file" },
        { status: 400 }
      );
    }

    // Insert recipients
    const recipients = uniqueEmails.map((email) => ({
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
      total: uniqueEmails.length,
    });
  } catch (error) {
    console.error("Error in POST email-lists/[id]/upload-excel:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
