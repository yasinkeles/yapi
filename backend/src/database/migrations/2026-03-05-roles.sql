-- Role normalization migration
-- Maps legacy roles and seeds new ones

-- Migrate existing users
UPDATE users SET role = 'seller' WHERE role = 'developer';
UPDATE users SET role = 'customer' WHERE role = 'user';

-- Remove legacy role rows to avoid conflicts
DELETE FROM roles WHERE name IN ('developer', 'user');

-- Seed required roles (idempotent)
INSERT INTO roles (name, display_name, description, permissions, is_system)
SELECT 'admin', 'Administrator', 'Full system access', '["*"]', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, display_name, description, permissions, is_system)
SELECT 'seller', 'Seller', 'Seller workspace access', '["/seller/*","/app/*"]', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'seller');

INSERT INTO roles (name, display_name, description, permissions, is_system)
SELECT 'customer', 'Customer', 'Customer workspace access', '["/app/*"]', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'customer');
