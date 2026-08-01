-- Add company_id to employees (0 = unassigned)
ALTER TABLE employees ADD COLUMN company_id INTEGER NOT NULL DEFAULT 0;

-- Migrate existing employees to company 1 if user owns it
UPDATE employees SET company_id = 1 WHERE user_id IN (SELECT owner_id FROM companies WHERE id = 1);
