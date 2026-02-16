-- Create email_lists table
CREATE TABLE IF NOT EXISTS email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create email_list_recipients table
CREATE TABLE IF NOT EXISTS email_list_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_list_id UUID NOT NULL REFERENCES email_lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email_list_id, email)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_lists_created_at ON email_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_list_recipients_email_list_id ON email_list_recipients(email_list_id);
CREATE INDEX IF NOT EXISTS idx_email_list_recipients_email ON email_list_recipients(email);

-- Note: email_lists and email_list_recipients are public tables (no RLS)
-- If you want to add user-specific lists, you can add user_id column and RLS policies later
