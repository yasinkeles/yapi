-- Multi-Database API Service - SQLite Schema
-- This database stores metadata for the API service

-- ============================================
-- Users Table
-- Stores admin users who can manage the system
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'developer',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  CONSTRAINT check_role CHECK (role IN ('admin', 'developer', 'viewer'))
);

-- ============================================
-- Data Sources Table
-- Stores database connection information
-- ============================================
CREATE TABLE IF NOT EXISTS data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  ssl_enabled BOOLEAN DEFAULT 0,
  ssl_ca_cert TEXT,
  pool_min INTEGER DEFAULT 2,
  pool_max INTEGER DEFAULT 10,
  connection_timeout INTEGER DEFAULT 30000,
  idle_timeout INTEGER DEFAULT 300000,
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_db_type CHECK (db_type IN ('oracle', 'postgresql', 'mysql', 'mssql', 'sqlite')),
  CONSTRAINT check_pool_min CHECK (pool_min >= 1),
  CONSTRAINT check_pool_max CHECK (pool_max >= pool_min)
);

-- ============================================
-- API Endpoints Table
-- Stores API endpoint definitions
-- ============================================
CREATE TABLE IF NOT EXISTS api_endpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  data_source_id INTEGER NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  http_method VARCHAR(10) NOT NULL,
  sql_query TEXT NOT NULL,
  query_type VARCHAR(20) NOT NULL,
  parameters TEXT,
  require_auth BOOLEAN DEFAULT 1,
  is_public BOOLEAN DEFAULT 0,
  max_rows INTEGER DEFAULT 1000,
  cache_ttl INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE')),
  CONSTRAINT check_query_type CHECK (query_type IN ('select', 'insert', 'update', 'delete')),
  CONSTRAINT check_max_rows CHECK (max_rows > 0 AND max_rows <= 10000)
);

-- ============================================
-- API Keys Table
-- Stores API keys for authentication
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT,
  rate_limit INTEGER DEFAULT 1000,
  ip_whitelist TEXT,
  expires_at DATETIME,
  is_active BOOLEAN DEFAULT 1,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  CONSTRAINT check_rate_limit CHECK (rate_limit > 0 AND rate_limit <= 100000)
);

-- ============================================
-- Request Logs Table
-- Stores all API request logs for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id VARCHAR(36) NOT NULL,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint_id VARCHAR(50) REFERENCES api_endpoints(endpoint_id) ON DELETE SET NULL,
  http_method VARCHAR(10) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_params TEXT,
  request_body TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  rows_affected INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Permission Groups Table
-- Role-based access control
-- ============================================
CREATE TABLE IF NOT EXISTS permission_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- User Group Memberships Table
-- Links users to permission groups
-- ============================================
CREATE TABLE IF NOT EXISTS user_group_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id)
);

-- ============================================
-- Refresh Tokens Table
-- Stores JWT refresh tokens
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- API Endpoints
CREATE INDEX IF NOT EXISTS idx_api_endpoints_endpoint_id ON api_endpoints(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_data_source_id ON api_endpoints(data_source_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_is_active ON api_endpoints(is_active);

-- API Keys
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Request Logs
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint_id ON request_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_response_status ON request_logs(response_status);

-- Data Sources
CREATE INDEX IF NOT EXISTS idx_data_sources_is_active ON data_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_data_sources_db_type ON data_sources(db_type);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Refresh Tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
