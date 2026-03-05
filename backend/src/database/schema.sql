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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
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

-- Insert default system roles if they don't exist
INSERT INTO roles (name, display_name, description, permissions, is_system)
VALUES
  ('admin', 'Administrator', 'Full system access', '["*"]', 1),
  ('developer', 'Developer', 'Technical pages access', '["/","/analytics","/data-sources","/api-endpoints","/api-keys","/profile"]', 1),
  ('user', 'User', 'Basic access', '["/","/analytics","/profile"]', 1)
ON CONFLICT (name) DO NOTHING;

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
