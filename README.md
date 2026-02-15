# Sasina

A Next.js 14 application for newsletter management.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with your Supabase, Gemini, and Resend credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=Newsletter <newsletter@yourdomain.com>
DEFAULT_USER_EMAIL=your-email@example.com
```

**SUPABASE_SERVICE_ROLE_KEY** is required for creating newsletters and viewing the preview (bypasses RLS). Get it from Supabase Dashboard → Settings → API → `service_role` key (keep it secret, server-only).

### Getting API Keys

**Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key and add it to your `.env.local` file

**Resend (wysyłanie e-maili – "Send Now"):**
1. Wejdź na [resend.com](https://resend.com) i załóż konto / zaloguj się.
2. W panelu: **API Keys** → **Create API Key** → skopiuj klucz (zaczyna się od `re_`).
3. W `.env.local` dodaj linię:
   ```env
   RESEND_API_KEY=re_xxxxxxxx
   ```
4. Aby móc wysyłać z własnego adresu (np. masterlork6@gmail.com), w Resend dodaj domenę i zweryfikuj ją. Na start możesz użyć domeny testowej Resend (w dashboardzie sprawdź **Domains** i ewentualnie **Send** z adresu typu `onboarding@resend.dev` do swojego e-maila).
5. Zrestartuj serwer (`npm run dev`). Po tym przycisk **Send Now** na podglądzie newslettera wyśle e-mail na adres z `DEFAULT_USER_EMAIL`.

## Database

Run the migration file in your Supabase SQL editor to create the necessary tables and RLS policies.

