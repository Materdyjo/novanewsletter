"use server";

import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { htmlToPlainText } from "@/lib/email-utils";

export async function sendNewsletter(
  newsletterId: string,
  htmlOverride?: string
) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return {
        error:
          "Brak klucza Resend. Dodaj RESEND_API_KEY do pliku .env.local (klucz z https://resend.com/api-keys), potem zrestartuj serwer (npm run dev).",
      };
    }

    const admin = getSupabaseAdmin();
    const { data: newsletter, error: fetchError } = await admin
      .from("newsletters")
      .select("*")
      .eq("id", newsletterId)
      .single();

    if (fetchError || !newsletter) {
      return { error: "Newsletter not found" };
    }

    if (newsletter.status === "sent") {
      return { error: "Newsletter has already been sent" };
    }

    // Get the recipient email address
    // Note: Currently uses DEFAULT_USER_EMAIL from environment variables
    // To implement user authentication: use Supabase Auth to get the current user's email
    // Example: const { data: { user } } = await supabase.auth.getUser(); const userEmail = user?.email;
    const userEmail = process.env.DEFAULT_USER_EMAIL || "mateuszignacik00@gmail.com";

    // Send email via Resend. You cannot use @gmail.com as "from" (Google's domain).
    // Use Resend's default for testing, or set RESEND_FROM_EMAIL to your verified domain (e.g. newsletter@yourdomain.com).
    const fromAddress =
      process.env.RESEND_FROM_EMAIL && !process.env.RESEND_FROM_EMAIL.toLowerCase().includes("gmail.com")
        ? process.env.RESEND_FROM_EMAIL
        : "onboarding@resend.dev";

    // Use editor's current HTML if provided (so we send what the user sees), otherwise DB
    let emailHtml =
      htmlOverride != null && htmlOverride.trim() !== ""
        ? htmlOverride.trim()
        : newsletter.email_body_html;

    // If still empty, use fallback message
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
    
    // Check HTML size - Gmail clips over ~102KB and shows "Wiadomość skrócona"
    const htmlSizeKB = new Blob([emailHtml]).size / 1024;
    const hasBase64Images = emailHtml.includes('data:image') || emailHtml.includes('base64');
    
    if (htmlSizeKB > 100) {
      console.warn(`Email HTML is ${htmlSizeKB.toFixed(1)}KB - Gmail may clip it. Consider using image URLs instead of embedded images.`);
    }
    if (hasBase64Images && htmlSizeKB > 50) {
      console.warn('Email contains base64 images which increase size. Use image URLs to avoid Gmail clipping.');
    }
    
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: userEmail,
      subject: newsletter.email_subject,
      html: emailHtml,
      text: plainText,
    });

    if (error) {
      console.error("Resend error:", error);
      return { error: `Failed to send email: ${error.message}` };
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

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Error in sendNewsletter:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to send newsletter",
    };
  }
}

