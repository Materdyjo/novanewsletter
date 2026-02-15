-- Allow newsletters without a user (fixes FK violation when no auth user exists yet)
ALTER TABLE newsletters
  ALTER COLUMN user_id DROP NOT NULL;
