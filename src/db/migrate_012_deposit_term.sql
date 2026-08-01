-- Deposit term support
ALTER TABLE investments ADD COLUMN term_minutes INTEGER DEFAULT 60;
ALTER TABLE investments ADD COLUMN mature_at INTEGER DEFAULT NULL;
