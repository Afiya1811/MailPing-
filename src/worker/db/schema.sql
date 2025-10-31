-- Users table (extends @getmocha/users-service)
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  google_email TEXT UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  token_expiry TIMESTAMP,
  last_email_sync TIMESTAMP,
  last_notification_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
  email_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  gmail_message_id TEXT NOT NULL,
  sender_email TEXT,
  sender_name TEXT,
  subject TEXT,
  body_plain TEXT,
  body_html TEXT,
  received_date TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  thread_id TEXT,
  raw_email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  UNIQUE (user_id, gmail_message_id)
);

-- Email labels table
CREATE TABLE IF NOT EXISTS email_labels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  label_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (email_id) REFERENCES emails(email_id)
);

-- Email attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  filename TEXT,
  mimetype TEXT,
  size INTEGER,
  gmail_attachment_id TEXT,
  stored_in_r2 BOOLEAN DEFAULT FALSE,
  r2_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES emails(email_id)
);

-- Notification log table
CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  notification_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notification_type TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (email_id) REFERENCES emails(email_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_user_date ON emails(user_id, received_date DESC);
CREATE INDEX IF NOT EXISTS idx_emails_user_read ON emails(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_emails_user_starred ON emails(user_id, is_starred);
CREATE INDEX IF NOT EXISTS idx_email_labels_user ON email_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
