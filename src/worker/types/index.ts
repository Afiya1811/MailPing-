// User types
export interface User {
  user_id: string;
  email: string;
  name: string;
  google_email: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  token_expiry: string | null;
  last_email_sync: string | null;
  last_notification_check: string | null;
  created_at: string;
  updated_at: string;
}

// Email types
export interface Email {
  email_id: string;
  user_id: string;
  gmail_message_id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  body_plain: string | null;
  body_html: string | null;
  received_date: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  thread_id: string | null;
  raw_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailResponse {
  id: string;
  gmail_id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  preview: string;
  received_date: string;
  is_read: boolean;
  is_starred: boolean;
  labels: string[];
}

export interface FullEmailResponse {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc: string | null;
  bcc: string | null;
  date: string;
  body_html: string | null;
  body_plain: string | null;
  attachments: EmailAttachment[];
  thread_id: string | null;
  labels: string[];
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
}

// Email label types
export interface EmailLabel {
  id: string;
  user_id: string;
  email_id: string;
  label_name: string;
  created_at: string;
}

// Email attachment types
export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  mimetype: string;
  size: number;
  gmail_attachment_id: string;
  stored_in_r2: boolean;
  r2_path: string | null;
  created_at: string;
}

// Notification log types
export interface NotificationLog {
  id: string;
  user_id: string;
  email_id: string;
  notification_sent_at: string;
  notification_type: 'browser' | 'desktop' | 'in_app';
}

// Gmail API types
export interface GmailToken {
  access_token: string;
  refresh_token: string | null;
  expiry_date: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    mimeType: string;
    headers: Array<{ name: string; value: string }>;
    parts?: Array<any>;
    body?: { size: number; data?: string };
  };
}

// API Request/Response types
export interface EmailListRequest {
  limit?: number;
  offset?: number;
  sort?: 'date_desc' | 'date_asc';
  filter_unread?: boolean;
  filter_starred?: boolean;
}

export interface EmailListResponse {
  emails: EmailResponse[];
  total_count: number;
  has_more: boolean;
}

export interface EmailSearchRequest {
  query: string;
  filters?: {
    is_unread?: boolean;
    is_starred?: boolean;
    date_from?: string;
    date_to?: string;
    labels?: string[];
    from?: string;
  };
}

export interface EmailSearchResponse {
  results: EmailResponse[];
}

export interface EmailUpdateRequest {
  is_read?: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
}

export interface EmailReplyRequest {
  reply_to_email_id: string;
  body_text: string;
  body_html?: string;
}

export interface EmailForwardRequest {
  forward_email_id: string;
  recipients: string[];
  subject?: string;
  body_text?: string;
}

export interface EmailActionResponse {
  success: boolean;
  sent_at?: string;
  message?: string;
}

export interface EmailSyncResponse {
  synced_count: number;
  errors: string[];
}

export interface CheckNewEmailsResponse {
  new_emails_count: number;
  processed_count: number;
}

// Auth types
export interface GoogleOAuthCode {
  code: string;
  state?: string;
}

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface JWTPayload {
  user_id: string;
  email: string;
  iat: number;
  exp: number;
}

// Error types
export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

// Context types
export interface WorkerContext {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
}
