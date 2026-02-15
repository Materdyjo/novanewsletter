"use server";

import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function sendNewsletter(newsletterId: string) {
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

    // Get the current user's email
    // For now, we'll use a placeholder or get from auth
    // TODO: Replace with actual user authentication
    const userEmail = process.env.DEFAULT_USER_EMAIL || "mateuszignacik00@gmail.com";

    // Send email via Resend. You cannot use @gmail.com as "from" (Google's domain).
    // Use Resend's default for testing, or set RESEND_FROM_EMAIL to your verified domain (e.g. newsletter@yourdomain.com).
    const fromAddress =
      process.env.RESEND_FROM_EMAIL && !process.env.RESEND_FROM_EMAIL.toLowerCase().includes("gmail.com")
        ? process.env.RESEND_FROM_EMAIL
        : "onboarding@resend.dev";

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: userEmail,
      subject: newsletter.email_subject,
      html: newsletter.email_body_html,
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

