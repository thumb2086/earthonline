-- Update existing employees to belong to company 1
UPDATE employees SET company_id = 1 WHERE company_id IS NULL OR company_id = 0;
