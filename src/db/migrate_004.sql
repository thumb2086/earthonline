ALTER TABLE users ADD COLUMN last_active INTEGER;
ALTER TABLE employees ADD COLUMN company_id INTEGER REFERENCES companies(id);
