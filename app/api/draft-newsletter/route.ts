import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { newsItemIds, article_ids } = body;

    // Support both newsItemIds and article_ids for compatibility
    const ids = newsItemIds || article_ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "article_ids (or newsItemIds) must be a non-empty array" },
        { status: 400 }
      );
    }

    // Check for Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    // No auth yet: insert without user_id (column is nullable after migration 003)
    const userId = null as string | null;

    // Fetch the selected news items to build the newsletter content
    const { data: newsItems, error: fetchError } = await supabase
      .from("news_items")
      .select("*")
      .in("id", ids);

    if (fetchError) {
      console.error("Error fetching news items:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch news items" },
        { status: 500 }
      );
    }

    if (!newsItems || newsItems.length === 0) {
      return NextResponse.json(
        { error: "No news items found" },
        { status: 404 }
      );
    }

    // Try multiple model names (Google often changes available models; v1beta can 404 on older names)
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const modelsToTry = (
      process.env.GEMINI_MODEL ||
      "gemini-2.5-flash,gemini-2.0-flash,gemini-3-flash-preview,gemini-pro"
    ).split(",").map((m) => m.trim());

    // Prepare the prompt for Gemini with article titles and snippets
    const articlesText = newsItems
      .map(
        (item, index) => `
Article ${index + 1}:
Title: ${item.title}
Snippet: ${item.summary || item.original_snippet || "No snippet available"}
URL: ${item.url}
`
      )
      .join("\n");

    const prompt = `Jesteś ekspertem-analitykiem branży owoców morza. Otrzymasz listę tytułów i fragmentów artykułów.

Pogrupuj je tematycznie (np. Akwakultura, Ceny rynkowe, Regulacje).

Dla każdego artykułu napisz 2-zdaniowe podsumowanie wykonawcze na podstawie fragmentu.

Wygeneruj poprawny HTML newslettera e-mail w języku POLSKIM. Użyj czystego, profesjonalnego formatu.

Articles:
${articlesText}

Wymagania:
1. Pogrupuj artykuły według tematu (np. Akwakultura, Ceny rynkowe, Regulacje, Zrównoważony rozwój).
2. Dla każdego artykułu napisz 2-zdaniowe podsumowanie wykonawcze po polsku.
3. Wygeneruj profesjonalny HTML newslettera:
   - Nagłówek z tytułem newslettera i datą (${new Date().toLocaleDateString("pl-PL")})
   - Sekcje pogrupowane tematycznie z wyraźnymi nagłówkami
   - Każdy artykuł: tytuł, 2-zdaniowe podsumowanie, link "Czytaj więcej"
   - Użyj inline CSS (klienci e-mail nie obsługują zewnętrznych arkuszy)
   - Układ responsywny
   - Profesjonalna kolorystyka
   - Dobra czytelność
4. Wszystkie linki do artykułów muszą być klikalne.

WAŻNE: Zwróć WYŁĄCZNIE poprawny kod HTML. Zacznij od <!DOCTYPE html>. Pisz cały tekst po polsku. Bez markdown, bez bloków kodu, bez wyjaśnień. Tylko HTML.`;

    let emailBodyHtml: string | undefined;
    let workingModelId: string | null = null;
    let lastError: Error | null = null;

    for (const modelId of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        emailBodyHtml = response.text();
        workingModelId = modelId;
        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`Gemini model "${modelId}" failed:`, (lastError as Error).message);
        continue;
      }
    }

    if (!workingModelId || typeof emailBodyHtml === "undefined") {
      console.error("All Gemini models failed. Last error:", lastError);
      return NextResponse.json(
        {
          error:
            "No Gemini model worked. Add GEMINI_MODEL to .env.local with a valid model (e.g. gemini-2.5-flash or gemini-pro). Check https://ai.google.dev/gemini-api/docs/models",
        },
        { status: 500 }
      );
    }

    // Clean up the response - remove markdown code blocks if present
    emailBodyHtml = emailBodyHtml
      .replace(/```html\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Generate email subject in Polish
    const subjectPrompt = `Na podstawie tych tytułów artykułów utwórz krótki, atrakcyjny temat e-maila (max 60 znaków) dla newslettera. Odpowiedz WYŁĄCZNIE po polsku, samą linią tematu, nic więcej.

${newsItems.map((item) => `- ${item.title}`).join("\n")}`;

    const subjectModel = genAI.getGenerativeModel({ model: workingModelId });
    const subjectResult = await subjectModel.generateContent(subjectPrompt);
    const subjectResponse = await subjectResult.response;
    let emailSubject = subjectResponse.text().trim();

    // Clean up subject line
    emailSubject = emailSubject.replace(/["']/g, "").trim();
    if (emailSubject.length > 60) {
      emailSubject = emailSubject.substring(0, 57) + "...";
    }
    if (!emailSubject) {
      emailSubject = `Newsletter - ${new Date().toLocaleDateString("pl-PL")}`;
    }

    // Ensure HTML is properly formatted
    if (!emailBodyHtml.trim().startsWith("<!DOCTYPE") && !emailBodyHtml.trim().startsWith("<html")) {
      emailBodyHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body>
${emailBodyHtml}
</body>
</html>`;
    }

    // Create the newsletter (use service role to bypass RLS; anon key causes 42501)
    const admin = getSupabaseAdmin();
    const { data: newsletter, error: newsletterError } = await admin
      .from("newsletters")
      .insert({
        ...(userId != null && { user_id: userId }),
        email_subject: emailSubject,
        email_body_html: emailBodyHtml,
        status: "draft",
      })
      .select()
      .single();

    if (newsletterError) {
      console.error("Error creating newsletter:", newsletterError);
      return NextResponse.json(
        { error: "Failed to create newsletter: " + (newsletterError.message || "check SUPABASE_SERVICE_ROLE_KEY") },
        { status: 500 }
      );
    }

    // Link news items to the newsletter
    const newsletterItems = ids.map((newsItemId: string) => ({
      newsletter_id: newsletter.id,
      news_item_id: newsItemId,
    }));

    const { error: linkError } = await admin
      .from("newsletter_items")
      .insert(newsletterItems);

    if (linkError) {
      console.error("Error linking news items:", linkError);
      // Newsletter was created, but linking failed
      // We'll still return success but log the error
    }

    return NextResponse.json({
      success: true,
      newsletterId: newsletter.id,
      message: "Draft newsletter created successfully",
    });
  } catch (error) {
    console.error("Error in draft-newsletter API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

