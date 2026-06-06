CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX user_sessions_user_active (user_id, expires_at, revoked_at)
);

CREATE TABLE IF NOT EXISTS connection_types (
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

INSERT INTO connection_types
  (id, app_name, app_icon, category, auth_type, required_scopes, available_triggers, available_actions, rate_limit_rules, error_handling_rules)
VALUES
  ('servicenow', 'ServiceNow', 'SN', 'ITSM', 'bearer_token', JSON_ARRAY('incident.write', 'case.write', 'user.read'), JSON_ARRAY('Incident Created', 'Incident Updated', 'Case Updated'), JSON_ARRAY('Create Incident', 'Update Incident', 'Create Case', 'Add Work Note'), JSON_ARRAY(JSON_OBJECT('window', 'minute', 'maxRequests', 120, 'strategy', 'queue')), JSON_OBJECT('retryableStatuses', JSON_ARRAY(429, 500, 502, 503, 504), 'maxRetries', 4, 'backoff', 'exponential', 'fallbackAction', 'send_to_dead_letter')),
  ('github', 'GitHub', 'GH', 'Developer', 'bearer_token', JSON_ARRAY('repo', 'read:user', 'issues:write'), JSON_ARRAY('Issue Opened', 'Issue Labeled', 'Pull Request Ready'), JSON_ARRAY('Create Issue', 'Add Comment', 'Apply Label', 'Dispatch Workflow'), JSON_ARRAY(JSON_OBJECT('window', 'hour', 'maxRequests', 5000, 'strategy', 'throttle')), JSON_OBJECT('retryableStatuses', JSON_ARRAY(403, 429, 500, 502, 503, 504), 'maxRetries', 3, 'backoff', 'exponential', 'fallbackAction', 'mark_failed')),
  ('google-sheets', 'Google Sheets', 'G', 'Google', 'oauth2', JSON_ARRAY('https://www.googleapis.com/auth/spreadsheets'), JSON_ARRAY('New Row', 'Updated Row'), JSON_ARRAY('Append Row', 'Update Row', 'Find Row', 'Create Sheet'), JSON_ARRAY(JSON_OBJECT('window', 'minute', 'maxRequests', 300, 'strategy', 'queue')), JSON_OBJECT('retryableStatuses', JSON_ARRAY(429, 500, 502, 503), 'maxRetries', 5, 'backoff', 'exponential', 'fallbackAction', 'send_to_dead_letter')),
  ('youtube', 'YouTube', 'YT', 'Video', 'oauth2', JSON_ARRAY('https://www.googleapis.com/auth/youtube.readonly'), JSON_ARRAY('Video Uploaded', 'Comment Added', 'Channel Updated'), JSON_ARRAY('Get Video', 'List Channel Videos', 'Fetch Captions'), JSON_ARRAY(JSON_OBJECT('window', 'day', 'maxRequests', 10000, 'strategy', 'throttle')), JSON_OBJECT('retryableStatuses', JSON_ARRAY(403, 429, 500, 503), 'maxRetries', 3, 'backoff', 'fixed', 'fallbackAction', 'skip_step')),
  ('wix', 'Wix', 'W', 'Website', 'oauth2', JSON_ARRAY('forms.read', 'contacts.write', 'sites.read'), JSON_ARRAY('Form Submitted', 'Contact Created', 'Order Created'), JSON_ARRAY('Create Contact', 'Update Contact', 'Get Form Submission'), JSON_ARRAY(JSON_OBJECT('window', 'minute', 'maxRequests', 200, 'strategy', 'queue')), JSON_OBJECT('retryableStatuses', JSON_ARRAY(408, 429, 500, 502, 503, 504), 'maxRetries', 4, 'backoff', 'exponential', 'fallbackAction', 'mark_failed')),
  ('instagram', 'Instagram', 'IG', 'Social', 'oauth2', JSON_ARRAY('instagram_basic', 'instagram_content_publish', 'pages_show_list'), JSON_ARRAY('Media Published', 'Comment Added'), JSON_ARRAY('Create Media Container', 'Publish Media', 'Reply To Comment'), JSON_ARRAY(JSON_OBJECT('window', 'hour', 'maxRequests', 200, 'strategy', 'throttle')), JSON_OBJECT('retryableStatuses', JSON_ARRAY(4, 17, 32, 613), 'maxRetries', 3, 'backoff', 'exponential', 'fallbackAction', 'mark_failed'))
ON DUPLICATE KEY UPDATE
  app_name = VALUES(app_name),
  app_icon = VALUES(app_icon),
  category = VALUES(category),
  auth_type = VALUES(auth_type),
  required_scopes = VALUES(required_scopes),
  available_triggers = VALUES(available_triggers),
  available_actions = VALUES(available_actions),
  rate_limit_rules = VALUES(rate_limit_rules),
  error_handling_rules = VALUES(error_handling_rules);

CREATE TABLE IF NOT EXISTS connections (
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

CREATE TABLE IF NOT EXISTS workflows (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  status ENUM('draft', 'published', 'active', 'inactive') NOT NULL DEFAULT 'draft',
  source_template_id VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE workflows MODIFY status ENUM('draft', 'published', 'active', 'inactive') NOT NULL DEFAULT 'draft';

CREATE TABLE IF NOT EXISTS workflow_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  definition JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id),
  UNIQUE KEY workflow_version_unique (workflow_id, version_number)
);

CREATE TABLE IF NOT EXISTS workflow_steps (
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

CREATE TABLE IF NOT EXISTS workflow_runs (
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

CREATE TABLE IF NOT EXISTS workflow_logs (
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

CREATE TABLE IF NOT EXISTS forms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NULL,
  success_message VARCHAR(255) NOT NULL DEFAULT 'Thanks. Your response was submitted.',
  header_image_url TEXT NULL,
  theme ENUM('blue', 'emerald', 'rose', 'slate', 'amber') NOT NULL DEFAULT 'blue',
  font_style ENUM('system', 'serif', 'mono', 'rounded') NOT NULL DEFAULT 'system',
  share_privacy ENUM('private', 'team', 'public') NOT NULL DEFAULT 'private',
  pii_sharing_mode ENUM('hash', 'exclude') NOT NULL DEFAULT 'hash',
  status ENUM('draft', 'published', 'disabled') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE forms ADD COLUMN IF NOT EXISTS header_image_url TEXT NULL;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS theme ENUM('blue', 'emerald', 'rose', 'slate', 'amber') NOT NULL DEFAULT 'blue';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS font_style ENUM('system', 'serif', 'mono', 'rounded') NOT NULL DEFAULT 'system';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS share_privacy ENUM('private', 'team', 'public') NOT NULL DEFAULT 'private';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS pii_sharing_mode ENUM('hash', 'exclude') NOT NULL DEFAULT 'hash';

CREATE TABLE IF NOT EXISTS form_fields (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(160) NOT NULL,
  field_key VARCHAR(120) NOT NULL,
  field_type ENUM('text', 'email', 'number', 'textarea', 'dropdown', 'checkbox', 'date') NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  hash_pii BOOLEAN NOT NULL DEFAULT FALSE,
  options JSON NULL,
  position INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES forms(id),
  UNIQUE KEY form_field_key_unique (form_id, field_key)
);

ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS hash_pii BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS form_submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_id BIGINT UNSIGNED NOT NULL,
  payload JSON NOT NULL,
  trigger_data JSON NOT NULL,
  request_meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES forms(id),
  INDEX form_submissions_form_created (form_id, created_at)
);

CREATE TABLE IF NOT EXISTS usage_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  metric ENUM('workflowRuns', 'apiCalls', 'aiActionUsage', 'activeWorkflows', 'activeConnections', 'formSubmissions', 'storageMb') NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  source_id VARCHAR(160) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX usage_events_user_period (user_id, occurred_at)
);

CREATE TABLE IF NOT EXISTS usage_monthly_rollups (
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

CREATE TABLE IF NOT EXISTS templates (
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

CREATE TABLE IF NOT EXISTS template_ratings (
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
