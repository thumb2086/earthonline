-- Move user 1's employees from company 1 to company 5 (大拇哥科技)
UPDATE employees SET company_id = 5 WHERE user_id = 1 AND company_id = 1;

-- Update company 5 share_price to reasonable IPO price
UPDATE companies SET share_price = 1000 WHERE id = 5;
