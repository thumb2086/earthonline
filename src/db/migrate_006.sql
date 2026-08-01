CREATE TABLE IF NOT EXISTS stock_inventory (
  company_id INTEGER PRIMARY KEY,
  cash INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO stock_inventory (company_id, cash, stock_quantity) 
  SELECT 1, cash, stock_inventory FROM system_reserve WHERE id = 1;
