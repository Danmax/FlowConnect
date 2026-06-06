CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('pending_verification', 'active', 'disabled') NOT NULL DEFAULT 'pending_verification',
  role ENUM('admin', 'builder', 'user') NOT NULL DEFAULT 'user',
  plan_id ENUM('starter', 'pro', 'enterprise') NOT NULL DEFAULT 'starter',
  email_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE connection_types (
  id VARCHAR(80) PRIMARY KEY,
  app_name VARCHAR(160) NOT NULL,
  app_icon VARCHAR(80) NOT NULL,
  category VARCHAR(80) NOT NULL,
  auth_type ENUM('oauth2', 'api_key', 'basic', 'bearer_token') NOT NULL,
  required_scopes JSON NOT NULL,
  available_triggers JSON NOT NULL,
  available_actions JSON NOT NULL,
  rate_limit_rules JSON NOT NULL,
  error_handling_rules JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE connections (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  connection_type_id VARCHAR(80) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  scopes JSON NOT NULL,
  status ENUM('enabled', 'disabled', 'error') NOT NULL DEFAULT 'enabled',
  health_status ENUM('unknown', 'healthy', 'unhealthy') NOT NULL DEFAULT 'unknown',
  last_checked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (connection_type_id) REFERENCES connection_types(id)
);

CREATE TABLE workflows (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  status ENUM('draft', 'active', 'inactive') NOT NULL DEFAULT 'draft',
  source_template_id VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE workflow_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  definition JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  UNIQUE KEY workflow_version_unique (workflow_id, version_number)
);

CREATE TABLE workflow_steps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL,
  step_type ENUM('trigger', 'transform', 'ai_action', 'function', 'connector_action', 'rest_api') NOT NULL,
  name VARCHAR(180) NOT NULL,
  position INT UNSIGNED NOT NULL,
  connector_type_id VARCHAR(80) NULL,
  action_key VARCHAR(120) NULL,
  config JSON NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  FOREIGN KEY (connector_type_id) REFERENCES connection_types(id)
);

CREATE TABLE workflow_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  trigger_data JSON NOT NULL,
  execution_time_ms INT UNSIGNED NULL,
  retry_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE workflow_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_run_id BIGINT UNSIGNED NOT NULL,
  step_id BIGINT UNSIGNED NULL,
  status ENUM('pending', 'running', 'completed', 'failed', 'skipped') NOT NULL,
  message TEXT NOT NULL,
  input_payload JSON NULL,
  output_payload JSON NULL,
  error_details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_run_id) REFERENCES workflow_runs(id),
  FOREIGN KEY (step_id) REFERENCES workflow_steps(id)
);

CREATE TABLE usage_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  metric ENUM('workflowRuns', 'apiCalls', 'aiActionUsage', 'activeWorkflows', 'activeConnections', 'formSubmissions', 'storageMb') NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  source_id VARCHAR(160) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX usage_events_user_period (user_id, occurred_at)
);

CREATE TABLE usage_monthly_rollups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  workflow_runs INT UNSIGNED NOT NULL DEFAULT 0,
  api_calls INT UNSIGNED NOT NULL DEFAULT 0,
  ai_action_usage INT UNSIGNED NOT NULL DEFAULT 0,
  active_workflows INT UNSIGNED NOT NULL DEFAULT 0,
  active_connections INT UNSIGNED NOT NULL DEFAULT 0,
  form_submissions INT UNSIGNED NOT NULL DEFAULT 0,
  storage_mb INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY usage_rollup_unique (user_id, period_start)
);

CREATE TABLE templates (
  id VARCHAR(120) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  apps JSON NOT NULL,
  flow JSON NOT NULL,
  official BOOLEAN NOT NULL DEFAULT FALSE,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  installs INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE template_ratings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_id VARCHAR(120) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY template_rating_user_unique (template_id, user_id),
  CHECK (rating BETWEEN 1 AND 5)
);
