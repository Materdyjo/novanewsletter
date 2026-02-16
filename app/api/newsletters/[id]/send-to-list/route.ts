import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { htmlToPlainText } from "@/lib/email-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const newsletterId = params.id;
    const body = await request.json();
    const { email_list_id } = body;

    if (!email_list_id) {
      return NextResponse.json(
        { error: "email_list_id is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        {
          error:
            "Brak klucza Resend. Dodaj RESEND_API_KEY do pliku .env.local (klucz z https://resend.com/api-keys), potem zrestartuj serwer (npm run dev).",
        },
        { status: 500 }
      );
    }

    const admin = getSupabaseAdmin();

    // Get the newsletter
    const { data: newsletter, error: fetchError } = await admin
      .from("newsletters")
      .select("*")
      .eq("id", newsletterId)
      .single();

    if (fetchError || !newsletter) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      );
    }

    if (newsletter.status === "sent") {
      return NextResponse.json(
        { error: "Newsletter has already been sent" },
        { status: 400 }
      );
    }

    // Get the email list
    const { data: emailList, error: listError } = await admin
      .from("email_lists")
      .select("*")
      .eq("id", email_list_id)
      .single();

    if (listError || !emailList) {
      return NextResponse.json(
        { error: "Email list not found" },
        { status: 404 }
      );
    }

    // Get all recipients from the list
    const { data: recipients, error: recipientsError } = await admin
      .from("email_list_recipients")
      .select("email")
      .eq("email_list_id", email_list_id);

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      return NextResponse.json(
        { error: "Failed to fetch recipients" },
        { status: 500 }
      );
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "Email list has no recipients" },
        { status: 400 }
      );
    }

    // Extract email addresses
    const emailAddresses = recipients.map((r) => r.email);

    // Send email via Resend
    const fromAddress =
      process.env.RESEND_FROM_EMAIL &&
      !process.env.RESEND_FROM_EMAIL.toLowerCase().includes("gmail.com")
        ? process.env.RESEND_FROM_EMAIL
        : "onboarding@resend.dev";

    // Ensure HTML is properly formatted
    let emailHtml = newsletter.email_body_html;
    
    // If HTML is empty or doesn't have proper structure, add a message
    if (!emailHtml || emailHtml.trim() === "") {
      emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <p>This newsletter is empty. Please add content using the editor.</p>
  </div>
</body>
</html>`;
    }

    const resend = new Resend(apiKey);
    const plainText = htmlToPlainText(emailHtml);

    // Resend supports sending to multiple recipients
    // Send to all recipients in one batch (multipart: html + text for better Gmail display)
    const { data, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: emailAddresses,
      subject: newsletter.email_subject,
      html: emailHtml,
      text: plainText,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return NextResponse.json(
        { error: `Failed to send email: ${sendError.message}` },
        { status: 500 }
      );
    }

    // Update newsletter status to "sent"
    const { error: updateError } = await admin
      .from("newsletters")
      .update({ status: "sent" })
      .eq("id", newsletterId);

    if (updateError) {
      console.error("Error updating newsletter status:", updateError);
      // Email was sent but status update failed - still return success
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      recipients_sent: emailAddresses.length,
    });
  } catch (error) {
    console.error("Error in send-to-list:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send newsletter",
      },
      { status: 500 }
    );
  }
}
