-- Add unique constraint on url column for news_items table
-- This allows upsert operations to work based on the url field
ALTER TABLE news_items 
ADD CONSTRAINT news_items_url_unique UNIQUE (url);

-- Create index on url for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_items_url ON news_items(url);

