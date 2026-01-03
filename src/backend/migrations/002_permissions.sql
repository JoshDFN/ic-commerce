-- Permission System (Based on Solidus/CanCanCan)
-- Roles and Permission Sets

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT UNIQUE NOT NULL,  -- admin, customer, sales_rep, etc.
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- ============================================
-- ROLE USERS (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS role_users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id         INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(role_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_role_users_user ON role_users(user_id);
CREATE INDEX IF NOT EXISTS idx_role_users_role ON role_users(role_id);

-- ============================================
-- PERMISSION SETS
-- ============================================
CREATE TABLE IF NOT EXISTS permission_sets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT UNIQUE NOT NULL,  -- OrderDisplay, OrderManagement, ProductDisplay, etc.
    description     TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- ============================================
-- ROLE PERMISSION SETS (many-to-many)
-- ============================================
CREATE TABLE IF NOT EXISTS role_permission_sets (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id             INTEGER NOT NULL,
    permission_set_id   INTEGER NOT NULL,
    created_at          INTEGER NOT NULL,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_set_id) REFERENCES permission_sets(id),
    UNIQUE(role_id, permission_set_id)
);
CREATE INDEX IF NOT EXISTS idx_role_perm_sets_role ON role_permission_sets(role_id);

-- ============================================
-- SEED DEFAULT ROLES
-- ============================================
INSERT INTO roles (name, created_at, updated_at) VALUES
    ('admin', 0, 0),
    ('customer', 0, 0),
    ('sales_rep', 0, 0),
    ('stock_manager', 0, 0);

-- ============================================
-- SEED PERMISSION SETS (Based on Solidus)
-- ============================================
INSERT INTO permission_sets (name, description, created_at, updated_at) VALUES
    ('SuperUser', 'Full access to everything', 0, 0),
    ('DefaultCustomer', 'Basic customer abilities (view products, manage own orders)', 0, 0),
    ('OrderDisplay', 'Can view orders', 0, 0),
    ('OrderManagement', 'Can manage orders (edit, cancel, refund)', 0, 0),
    ('ProductDisplay', 'Can view products (including inactive)', 0, 0),
    ('ProductManagement', 'Can create, update, delete products', 0, 0),
    ('UserDisplay', 'Can view users/customers', 0, 0),
    ('UserManagement', 'Can manage users', 0, 0),
    ('StockDisplay', 'Can view stock levels', 0, 0),
    ('StockManagement', 'Can manage stock (adjust inventory)', 0, 0),
    ('PromotionDisplay', 'Can view promotions', 0, 0),
    ('PromotionManagement', 'Can manage promotions', 0, 0),
    ('SettingsDisplay', 'Can view store settings', 0, 0),
    ('SettingsManagement', 'Can manage store settings', 0, 0),
    ('ReportDisplay', 'Can view reports and analytics', 0, 0);

-- ============================================
-- ASSIGN PERMISSION SETS TO ROLES
-- ============================================

-- Admin gets SuperUser (everything)
INSERT INTO role_permission_sets (role_id, permission_set_id, created_at, updated_at)
SELECT r.id, p.id, 0, 0 FROM roles r, permission_sets p
WHERE r.name = 'admin' AND p.name = 'SuperUser';

-- Customer gets DefaultCustomer
INSERT INTO role_permission_sets (role_id, permission_set_id, created_at, updated_at)
SELECT r.id, p.id, 0, 0 FROM roles r, permission_sets p
WHERE r.name = 'customer' AND p.name = 'DefaultCustomer';

-- Sales rep gets order and product display/management
INSERT INTO role_permission_sets (role_id, permission_set_id, created_at, updated_at)
SELECT r.id, p.id, 0, 0 FROM roles r, permission_sets p
WHERE r.name = 'sales_rep' AND p.name IN ('OrderDisplay', 'OrderManagement', 'ProductDisplay', 'UserDisplay');

-- Stock manager gets stock management
INSERT INTO role_permission_sets (role_id, permission_set_id, created_at, updated_at)
SELECT r.id, p.id, 0, 0 FROM roles r, permission_sets p
WHERE r.name = 'stock_manager' AND p.name IN ('StockDisplay', 'StockManagement', 'ProductDisplay');

-- ============================================
-- UPDATE USERS TABLE to support multiple roles
-- ============================================
-- Add a default_role column (keeping existing 'role' for backwards compat)
ALTER TABLE users ADD COLUMN default_role_id INTEGER REFERENCES roles(id);

-- Migrate existing admin users to have admin role
INSERT INTO role_users (role_id, user_id, created_at, updated_at)
SELECT r.id, u.id, 0, 0 FROM users u, roles r
WHERE u.role = 'admin' AND r.name = 'admin';

-- Migrate existing customer users to have customer role
INSERT INTO role_users (role_id, user_id, created_at, updated_at)
SELECT r.id, u.id, 0, 0 FROM users u, roles r
WHERE u.role = 'customer' AND r.name = 'customer';
