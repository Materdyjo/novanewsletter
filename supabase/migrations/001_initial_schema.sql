-- Create news_items table
CREATE TABLE IF NOT EXISTS news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_site TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  summary TEXT,
  original_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create newsletters table
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_subject TEXT NOT NULL,
  email_body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create newsletter_items table (linking table)
CREATE TABLE IF NOT EXISTS newsletter_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  news_item_id UUID NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (newsletter_id, news_item_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_source_site ON news_items(source_site);
CREATE INDEX IF NOT EXISTS idx_newsletters_user_id ON newsletters(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_status ON newsletters(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_items_newsletter_id ON newsletter_items(newsletter_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_items_news_item_id ON newsletter_items(news_item_id);

-- Enable Row Level Security
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own newsletters
CREATE POLICY "Users can view their own newsletters"
  ON newsletters
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own newsletters
CREATE POLICY "Users can insert their own newsletters"
  ON newsletters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own newsletters
CREATE POLICY "Users can update their own newsletters"
  ON newsletters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own newsletters
CREATE POLICY "Users can delete their own newsletters"
  ON newsletters
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only see newsletter_items for their own newsletters
CREATE POLICY "Users can view newsletter_items for their own newsletters"
  ON newsletter_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM newsletters
      WHERE newsletters.id = newsletter_items.newsletter_id
      AND newsletters.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only insert newsletter_items for their own newsletters
CREATE POLICY "Users can insert newsletter_items for their own newsletters"
  ON newsletter_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM newsletters
      WHERE newsletters.id = newsletter_items.newsletter_id
      AND newsletters.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only update newsletter_items for their own newsletters
CREATE POLICY "Users can update newsletter_items for their own newsletters"
  ON newsletter_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM newsletters
      WHERE newsletters.id = newsletter_items.newsletter_id
      AND newsletters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM newsletters
      WHERE newsletters.id = newsletter_items.newsletter_id
      AND newsletters.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only delete newsletter_items for their own newsletters
CREATE POLICY "Users can delete newsletter_items for their own newsletters"
  ON newsletter_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM newsletters
      WHERE newsletters.id = newsletter_items.newsletter_id
      AND newsletters.user_id = auth.uid()
    )
  );

-- Note: news_items table is public (no RLS) as it contains shared news content
-- If you want to restrict access to news_items, you can add RLS policies here

