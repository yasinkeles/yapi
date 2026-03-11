-- ============================================
-- Admin/Marketplace Control Panel Extensions
-- ============================================


-- Users: admin/suspension fields are defined in the CREATE TABLE below

-- Sellers: Add approval fields
CREATE TABLE IF NOT EXISTS sellers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_status VARCHAR(20) DEFAULT 'pending',
  approval_note TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by_admin_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores: Add moderation fields
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  moderation_status VARCHAR(20) DEFAULT 'draft',
  moderation_note TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by_admin_id INTEGER REFERENCES users(id),
  is_published SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories: Add/confirm admin fields
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_group VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by_admin_id INTEGER REFERENCES users(id)
);

-- Admin Audit Log
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ============================================
-- Marketplace Commerce: Cart
-- ============================================
CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  campaign_price_snapshot NUMERIC(12,2),
  product_name_snapshot VARCHAR(200),
  product_image_snapshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller_id ON cart_items(seller_id);

-- ============================================
-- Marketplace Commerce: Customer Address
-- ============================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100),
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  city VARCHAR(80) NOT NULL,
  district VARCHAR(80),
  neighborhood VARCHAR(120),
  address_line VARCHAR(300) NOT NULL,
  postal_code VARCHAR(20),
  address_type VARCHAR(40),
  is_default SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_default ON customer_addresses(customer_id, is_default);

-- ============================================
-- Marketplace Commerce: Orders
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(32) UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shipping_address_id INTEGER NOT NULL REFERENCES customer_addresses(id) ON DELETE SET NULL,
  billing_address_id INTEGER REFERENCES customer_addresses(id) ON DELETE SET NULL,
  payment_method VARCHAR(40) NOT NULL,
  order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL,
  discount_total NUMERIC(12,2) DEFAULT 0,
  shipping_total NUMERIC(12,2) DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL,
  customer_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name_snapshot VARCHAR(200),
  product_image_snapshot TEXT,
  sku_snapshot VARCHAR(80),
  unit_price NUMERIC(12,2) NOT NULL,
  campaign_price_applied NUMERIC(12,2),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);
-- Multi-Database API Service - PostgreSQL Schema

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'developer',
  is_active SMALLINT DEFAULT 1,
  is_suspended SMALLINT DEFAULT 0,
  is_email_verified SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  two_factor_secret TEXT,
  two_factor_enabled SMALLINT DEFAULT 0,
  two_factor_recovery_codes TEXT
);

-- ============================================
-- Roles Table
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL,
  is_system SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing users to new roles
UPDATE users SET role = 'seller' WHERE role = 'developer';
UPDATE users SET role = 'customer' WHERE role = 'user';

-- Remove legacy role rows to avoid conflicts
DELETE FROM roles WHERE name IN ('developer', 'user');

INSERT INTO roles (name, display_name, description, permissions, is_system)
SELECT 'admin', 'Administrator', 'Full system access', '["*"]', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, display_name, description, permissions, is_system)
SELECT 'seller', 'Seller', 'Seller workspace access', '["/seller/*","/app/*"]', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'seller');

INSERT INTO roles (name, display_name, description, permissions, is_system)
SELECT 'customer', 'Customer', 'Customer workspace access', '["/app/*"]', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'customer');

-- ============================================
-- Data Sources Table
-- ============================================
CREATE TABLE IF NOT EXISTS data_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  db_type VARCHAR(20) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  database_name VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL,
  encrypted_password TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  encryption_auth_tag TEXT NOT NULL,
  ssl_enabled SMALLINT DEFAULT 0,
  ssl_ca_cert TEXT,
  pool_min INTEGER DEFAULT 2,
  pool_max INTEGER DEFAULT 10,
  connection_timeout INTEGER DEFAULT 30000,
  idle_timeout INTEGER DEFAULT 300000,
  is_active SMALLINT DEFAULT 1,
  is_private SMALLINT DEFAULT 0,
  group_name VARCHAR(100),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- API Endpoints Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_endpoints (
  id SERIAL PRIMARY KEY,
  endpoint_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  data_source_id INTEGER NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  http_method VARCHAR(10) NOT NULL,
  sql_query TEXT NOT NULL,
  query_type VARCHAR(20) NOT NULL,
  parameters TEXT,
  require_auth SMALLINT DEFAULT 1,
  is_public SMALLINT DEFAULT 0,
  is_private SMALLINT DEFAULT 0,
  group_name VARCHAR(100),
  max_rows INTEGER DEFAULT 1000,
  cache_ttl INTEGER DEFAULT 0,
  is_active SMALLINT DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- API Keys Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT,
  rate_limit INTEGER DEFAULT 1000,
  ip_whitelist TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active SMALLINT DEFAULT 1,
  is_private SMALLINT DEFAULT 0,
  encrypted_key TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Request Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS request_logs (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint_id VARCHAR(50),
  http_method VARCHAR(10) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_params TEXT,
  request_body TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  rows_affected INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Permission Groups Table
-- ============================================
CREATE TABLE IF NOT EXISTS permission_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- User Group Memberships Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_group_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- ============================================
-- Refresh Tokens Table
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_api_endpoints_endpoint_id ON api_endpoints(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_data_source_id ON api_endpoints(data_source_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_is_active ON api_endpoints(is_active);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint_id ON request_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_response_status ON request_logs(response_status);

CREATE INDEX IF NOT EXISTS idx_data_sources_is_active ON data_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_data_sources_db_type ON data_sources(db_type);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);


CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  title VARCHAR(150) NOT NULL DEFAULT 'Untitled',
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | published | archived
  current_version_id INTEGER,
  content_json JSONB NOT NULL DEFAULT '{}',
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_versions (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title VARCHAR(200),
  description TEXT,
  path VARCHAR(200) NOT NULL, -- UI route (e.g. /p/sales)
  layout_json JSONB NOT NULL DEFAULT '{}',
  components_json JSONB NOT NULL DEFAULT '{}',
  permissions_json JSONB,
  visibility_rules_json JSONB,
  published_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (page_id, version)
);

-- Foreign key linking pages -> page_versions
ALTER TABLE pages ADD CONSTRAINT fk_pages_current_version FOREIGN KEY (current_version_id) REFERENCES page_versions(id) ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  permissions_json JSONB,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  label VARCHAR(150) NOT NULL,
  icon VARCHAR(80),
  target_type VARCHAR(20) NOT NULL, -- page | url | group
  target_ref VARCHAR(200), -- page_id or url
  parent_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  children_json JSONB,
  permissions_json JSONB,
  visibility_expr VARCHAR(500),
  is_active SMALLINT DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_audit_logs (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  page_version_id INTEGER REFERENCES page_versions(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- create | update | publish | archive | revert
  actor_id INTEGER REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- parent_id is defined in CREATE TABLE; remove legacy add to avoid parser complaints

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_menus_key ON menus(key);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON menu_items(parent_id);

CREATE INDEX IF NOT EXISTS idx_pages_title ON pages(title);

-- Duplicate categories table definition removed. Only the admin/marketplace version remains above.

-- ============================================
-- Storefront Catalog: Products
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  slug VARCHAR(180) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  short_description VARCHAR(400),
  description TEXT,
  base_price NUMERIC(12,2) NOT NULL,
  campaign_price NUMERIC(12,2),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  stock_qty INTEGER DEFAULT 0,
  sku VARCHAR(80),
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ============================================
-- Storefront Catalog: Product Images
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  alt_text VARCHAR(200),
  is_main SMALLINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort_order ON product_images(product_id, sort_order);

-- ============================================
-- Storefront Catalog: Product Specifications
-- ============================================
CREATE TABLE IF NOT EXISTS product_specifications (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_group VARCHAR(120),
  spec_key VARCHAR(150) NOT NULL,
  spec_value VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_specs_product_id ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_sort_order ON product_specifications(product_id, sort_order);

-- ============================================
-- Storefront Catalog: Product Reviews (placeholder)
-- ============================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  comment TEXT,
  is_approved SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(product_id, is_approved);

-- ============================================
-- Seller Storefront: SellerStore
-- ============================================
CREATE TABLE IF NOT EXISTS seller_stores (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name VARCHAR(200) NOT NULL,
  slug VARCHAR(180) UNIQUE NOT NULL,
  tagline VARCHAR(250),
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  theme_color VARCHAR(30),
  accent_color VARCHAR(30),
  card_template VARCHAR(50) DEFAULT 'template-1',
  homepage_template VARCHAR(50) DEFAULT 'default',
  is_published SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_stores_seller_id ON seller_stores(seller_id);

-- ============================================
-- Seller Storefront: Sections
-- ============================================
CREATE TABLE IF NOT EXISTS seller_store_sections (
  id SERIAL PRIMARY KEY,
  seller_store_id INTEGER REFERENCES seller_stores(id) ON DELETE CASCADE,
  seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES seller_stores(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL DEFAULT 'products',
  title VARCHAR(200),
  subtitle VARCHAR(300),
  sort_order INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  card_template VARCHAR(50) DEFAULT 'template-1',
  is_pinned SMALLINT DEFAULT 0,
  is_visible SMALLINT DEFAULT 1,
  is_enabled SMALLINT DEFAULT 1,
  config_json JSONB DEFAULT CAST('{}' AS JSONB),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_store_sections_store_id ON seller_store_sections(seller_store_id);
CREATE INDEX IF NOT EXISTS idx_seller_store_sections_sort ON seller_store_sections(seller_store_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_seller_store_sections_seller_id ON seller_store_sections(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_store_sections_store_id_position ON seller_store_sections(store_id, position);

-- ============================================
-- Seller Storefront: Card Style
-- ============================================
CREATE TABLE IF NOT EXISTS seller_card_styles (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES seller_stores(id) ON DELETE CASCADE,
  layout_style VARCHAR(50) DEFAULT 'template-1',
  card_template VARCHAR(50) DEFAULT 'template-1',
  image_aspect_ratio VARCHAR(30) DEFAULT 'square',
  title_lines SMALLINT DEFAULT 2,
  show_campaign_badge SMALLINT DEFAULT 1,
  show_old_price SMALLINT DEFAULT 1,
  show_discount_percent SMALLINT DEFAULT 0,
  show_quick_actions SMALLINT DEFAULT 0,
  text_align VARCHAR(20) DEFAULT 'left',
  border_radius VARCHAR(20) DEFAULT 'md',
  card_shadow VARCHAR(20) DEFAULT 'soft',
  primary_color VARCHAR(30),
  secondary_color VARCHAR(30),
  text_color VARCHAR(30),
  background_color VARCHAR(30),
  config_json JSONB DEFAULT CAST('{}' AS JSONB),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seller_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_card_styles_store_id ON seller_card_styles(store_id);

INSERT INTO categories (name, slug)
SELECT 'Electronics', 'electronics'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'electronics');

INSERT INTO categories (name, slug)
SELECT 'Home', 'home'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'home');

INSERT INTO categories (name, slug)
SELECT 'Fashion', 'fashion'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'fashion');

INSERT INTO categories (name, slug)
SELECT 'Sports', 'sports'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sports');

INSERT INTO categories (name, slug)
SELECT 'Books', 'books'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'books');


-- ============================================
-- Seller Storefront: Featured Products
-- ============================================
CREATE TABLE IF NOT EXISTS seller_featured_products (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seller_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_featured_products_seller_id ON seller_featured_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_featured_products_product_id ON seller_featured_products(product_id);
CREATE INDEX IF NOT EXISTS idx_seller_featured_products_active ON seller_featured_products(is_active);

-- ============================================
-- Seller Storefront: Campaign / Promo Blocks
-- ============================================
CREATE TABLE IF NOT EXISTS seller_campaign_blocks (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(300),
  description TEXT,
  image_url TEXT,
  button_text VARCHAR(100),
  button_link VARCHAR(300),
  badge_text VARCHAR(80),
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  is_active SMALLINT DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  block_type VARCHAR(40) NOT NULL DEFAULT 'promo_banner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_campaign_blocks_seller_id ON seller_campaign_blocks(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_campaign_blocks_active ON seller_campaign_blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_seller_campaign_blocks_sort ON seller_campaign_blocks(seller_id, sort_order);

-- ============================================
-- Seller Pricing: Campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS seller_campaigns (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seller_campaign_products (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES seller_campaigns(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_campaigns_seller_id ON seller_campaigns(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_campaigns_active ON seller_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_seller_campaign_products_campaign_id ON seller_campaign_products(campaign_id);

-- ============================================
-- Seller Pricing: Coupons
-- ============================================
CREATE TABLE IF NOT EXISTS seller_coupons (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(10,2) NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seller_id, code)
);

CREATE TABLE IF NOT EXISTS seller_coupon_products (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES seller_coupons(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(coupon_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_coupons_seller_id ON seller_coupons(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_coupon_products_coupon_id ON seller_coupon_products(coupon_id);

-- ============================================
-- Seller Pricing: Scheduled Prices
-- ============================================
CREATE TABLE IF NOT EXISTS seller_scheduled_prices (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  is_applied SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_scheduled_prices_seller_id ON seller_scheduled_prices(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_scheduled_prices_product_id ON seller_scheduled_prices(product_id);

-- ============================================
-- Stock: Warehouses
-- ============================================
CREATE TABLE IF NOT EXISTS seller_warehouses (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(80),
  capacity INTEGER,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_warehouses_seller_id ON seller_warehouses(seller_id);

-- ============================================
-- Stock: Warehouse Inventory
-- ============================================
CREATE TABLE IF NOT EXISTS seller_warehouse_inventory (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES seller_warehouses(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  reserved_qty INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(warehouse_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_warehouse_inventory_seller_id ON seller_warehouse_inventory(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_warehouse_inventory_warehouse_id ON seller_warehouse_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_seller_warehouse_inventory_product_id ON seller_warehouse_inventory(product_id);

-- ============================================
-- Stock: Stock Movements
-- ============================================
CREATE TABLE IF NOT EXISTS seller_stock_movements (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES seller_warehouses(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_stock_movements_seller_id ON seller_stock_movements(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_stock_movements_warehouse_id ON seller_stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_seller_stock_movements_product_id ON seller_stock_movements(product_id);

-- ============================================
-- Seller Settings
-- ============================================
CREATE TABLE IF NOT EXISTS seller_settings (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  store_name VARCHAR(200),
  store_logo TEXT,
  store_description TEXT,
  contact_email VARCHAR(100),
  contact_phone VARCHAR(40),
  shipping_regions JSONB DEFAULT '[]',
  shipping_price NUMERIC(10,2) DEFAULT 0,
  free_shipping_threshold NUMERIC(10,2),
  bank_name VARCHAR(100),
  bank_iban VARCHAR(50),
  tax_id VARCHAR(50),
  invoice_address TEXT,
  notify_orders SMALLINT DEFAULT 1,
  notify_low_stock SMALLINT DEFAULT 1,
  notify_email SMALLINT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
