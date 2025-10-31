import { User, Email, EmailLabel, EmailAttachment, NotificationLog } from '../types/index';

export class DatabaseService {
  constructor(private db: D1Database) {}

  // User operations
  async getUserById(userId: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE user_id = ?')
      .bind(userId)
      .first<User>();
    return result || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first<User>();
    return result || null;
  }

  async getUserByGoogleEmail(googleEmail: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE google_email = ?')
      .bind(googleEmail)
      .first<User>();
    return result || null;
  }

  async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    await this.db
      .prepare(
        `INSERT INTO users (
        user_id, email, name, google_email, google_access_token,
        google_refresh_token, token_expiry, last_email_sync, last_notification_check
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        user.user_id,
        user.email,
        user.name,
        user.google_email,
        user.google_access_token,
        user.google_refresh_token,
        user.token_expiry,
        user.last_email_sync,
        user.last_notification_check
      )
      .run();

    return this.getUserById(user.user_id) as Promise<User>;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    await this.db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`)
      .bind(...values)
      .run();

    return this.getUserById(userId) as Promise<User>;
  }

  // Email operations
  async getEmailById(emailId: string, userId: string): Promise<Email | null> {
    const result = await this.db
      .prepare('SELECT * FROM emails WHERE email_id = ? AND user_id = ?')
      .bind(emailId, userId)
      .first<Email>();
    return result || null;
  }

  async getEmailByGmailMessageId(gmailMessageId: string, userId: string): Promise<Email | null> {
    const result = await this.db
      .prepare('SELECT * FROM emails WHERE gmail_message_id = ? AND user_id = ?')
      .bind(gmailMessageId, userId)
      .first<Email>();
    return result || null;
  }

  async createEmail(email: Omit<Email, 'created_at' | 'updated_at'>): Promise<Email> {
    await this.db
      .prepare(
        `INSERT INTO emails (
        email_id, user_id, gmail_message_id, sender_email, sender_name,
        subject, body_plain, body_html, received_date, is_read, is_starred,
        is_archived, is_deleted, thread_id, raw_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        email.email_id,
        email.user_id,
        email.gmail_message_id,
        email.sender_email,
        email.sender_name,
        email.subject,
        email.body_plain,
        email.body_html,
        email.received_date,
        email.is_read ? 1 : 0,
        email.is_starred ? 1 : 0,
        email.is_archived ? 1 : 0,
        email.is_deleted ? 1 : 0,
        email.thread_id,
        email.raw_email
      )
      .run();

    return this.getEmailById(email.email_id, email.user_id) as Promise<Email>;
  }

  async updateEmail(emailId: string, userId: string, updates: Partial<Email>): Promise<Email> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'email_id' && key !== 'user_id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(emailId);
    values.push(userId);

    await this.db
      .prepare(`UPDATE emails SET ${fields.join(', ')} WHERE email_id = ? AND user_id = ?`)
      .bind(...values)
      .run();

    return this.getEmailById(emailId, userId) as Promise<Email>;
  }

  async listEmails(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: { is_unread?: boolean; is_starred?: boolean }
  ): Promise<{ emails: Email[]; total: number }> {
    let query = 'SELECT * FROM emails WHERE user_id = ? AND is_deleted = 0';
    const bindings: any[] = [userId];

    if (filters?.is_unread) {
      query += ' AND is_read = 0';
    }
    if (filters?.is_starred) {
      query += ' AND is_starred = 1';
    }

    query += ' ORDER BY received_date DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const emails = await this.db.prepare(query).bind(...bindings).all<Email>();

    const countQuery =
      'SELECT COUNT(*) as total FROM emails WHERE user_id = ? AND is_deleted = 0';
    const countBindings: any[] = [userId];

    if (filters?.is_unread) {
      countQuery += ' AND is_read = 0';
    }
    if (filters?.is_starred) {
      countQuery += ' AND is_starred = 1';
    }

    const countResult = await this.db
      .prepare(countQuery as any)
      .bind(...countBindings)
      .first<{ total: number }>();

    return {
      emails: emails.results || [],
      total: countResult?.total || 0,
    };
  }

  async getEmailsSinceDate(userId: string, since: string): Promise<Email[]> {
    const result = await this.db
      .prepare(
        'SELECT * FROM emails WHERE user_id = ? AND received_date > ? AND is_deleted = 0 ORDER BY received_date DESC'
      )
      .bind(userId, since)
      .all<Email>();

    return result.results || [];
  }

  async searchEmails(userId: string, query: string): Promise<Email[]> {
    const searchTerm = `%${query}%`;
    const result = await this.db
      .prepare(
        `SELECT * FROM emails WHERE user_id = ? AND is_deleted = 0 AND (
        subject LIKE ? OR sender_email LIKE ? OR sender_name LIKE ? OR body_plain LIKE ?
      ) ORDER BY received_date DESC`
      )
      .bind(userId, searchTerm, searchTerm, searchTerm, searchTerm)
      .all<Email>();

    return result.results || [];
  }

  // Email label operations
  async addLabel(label: Omit<EmailLabel, 'created_at'>): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO email_labels (id, user_id, email_id, label_name) VALUES (?, ?, ?, ?)'
      )
      .bind(label.id, label.user_id, label.email_id, label.label_name)
      .run();
  }

  async removeLabel(emailId: string, labelName: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM email_labels WHERE email_id = ? AND label_name = ?')
      .bind(emailId, labelName)
      .run();
  }

  async getLabelsForEmail(emailId: string): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT label_name FROM email_labels WHERE email_id = ?')
      .bind(emailId)
      .all<{ label_name: string }>();

    return (result.results || []).map((row) => row.label_name);
  }

  // Email attachment operations
  async createAttachment(attachment: Omit<EmailAttachment, 'created_at'>): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO email_attachments (
        id, email_id, filename, mimetype, size, gmail_attachment_id,
        stored_in_r2, r2_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        attachment.id,
        attachment.email_id,
        attachment.filename,
        attachment.mimetype,
        attachment.size,
        attachment.gmail_attachment_id,
        attachment.stored_in_r2 ? 1 : 0,
        attachment.r2_path
      )
      .run();
  }

  async getAttachmentsForEmail(emailId: string): Promise<EmailAttachment[]> {
    const result = await this.db
      .prepare('SELECT * FROM email_attachments WHERE email_id = ?')
      .bind(emailId)
      .all<EmailAttachment>();

    return result.results || [];
  }

  // Notification log operations
  async logNotification(log: Omit<NotificationLog, 'created_at'>): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO notification_log (id, user_id, email_id, notification_type, notification_sent_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(
        log.id,
        log.user_id,
        log.email_id,
        log.notification_type,
        log.notification_sent_at || new Date().toISOString()
      )
      .run();
  }

  async hasNotificationBeenSent(emailId: string, userId: string, type: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        'SELECT COUNT(*) as count FROM notification_log WHERE email_id = ? AND user_id = ? AND notification_type = ?'
      )
      .bind(emailId, userId, type)
      .first<{ count: number}>();

    return (result?.count || 0) > 0;
  }
}
