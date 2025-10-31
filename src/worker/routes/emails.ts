import { Hono } from 'hono';
import { GmailService } from '../services/gmail';
import { DatabaseService } from '../services/database';
import { tokenService } from '../services/token';
import { getUser } from '../middleware/auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { v4 as uuidv4 } from 'crypto';

export function createEmailRoutes(gmailService: GmailService, dbService: DatabaseService): Hono {
  const router = new Hono();

  // Validation schemas
  const emailListSchema = z.object({
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
    sort: z.enum(['date_desc', 'date_asc']).default('date_desc'),
    filter_unread: z.boolean().optional(),
    filter_starred: z.boolean().optional(),
  });

  const emailUpdateSchema = z.object({
    is_read: z.boolean().optional(),
    is_starred: z.boolean().optional(),
    is_archived: z.boolean().optional(),
  });

  const searchSchema = z.object({
    query: z.string().min(1),
    filters: z
      .object({
        is_unread: z.boolean().optional(),
        is_starred: z.boolean().optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional(),
        labels: z.array(z.string()).optional(),
        from: z.string().optional(),
      })
      .optional(),
  });

  const replySchema = z.object({
    reply_to_email_id: z.string(),
    body_text: z.string().min(1),
    body_html: z.string().optional(),
  });

  const forwardSchema = z.object({
    forward_email_id: z.string(),
    recipients: z.array(z.string().email()).min(1),
    subject: z.string().optional(),
    body_text: z.string().optional(),
  });

  // Sync emails endpoint
  router.post('/sync', async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const dbUser = await dbService.getUserById(user.user_id);
      if (!dbUser?.google_access_token) {
        return c.json({ success: false, error: 'Gmail not connected' }, 403);
      }

      const decryptedToken = await tokenService.decrypt(dbUser.google_access_token);
      const errors: string[] = [];
      let syncedCount = 0;

      // Fetch all messages with pagination
      let pageToken: string | undefined;
      let isFirstPage = true;

      do {
        try {
          const { messages, nextPageToken } = await gmailService.getMessages(decryptedToken, pageToken);

          for (const message of messages) {
            try {
              // Check if email already exists
              const existing = await dbService.getEmailByGmailMessageId(message.id, user.user_id);
              if (existing) {
                continue; // Skip duplicates
              }

              // Fetch full message details
              const fullMessage = await gmailService.getMessage(decryptedToken, message.id);
              const parsed = gmailService.parseEmailFromMessage(fullMessage);

              const emailId = uuidv4();
              await dbService.createEmail({
                email_id: emailId,
                user_id: user.user_id,
                gmail_message_id: message.id,
                sender_email: parsed.sender_email,
                sender_name: parsed.sender_name,
                subject: parsed.subject,
                body_plain: parsed.body_plain,
                body_html: parsed.body_html,
                received_date: parsed.received_date,
                is_read: false,
                is_starred: false,
                is_archived: false,
                is_deleted: false,
                thread_id: fullMessage.threadId || null,
                raw_email: JSON.stringify(fullMessage),
              });

              syncedCount++;
            } catch (msgError) {
              errors.push(`Failed to sync message ${message.id}: ${String(msgError)}`);
            }
          }

          pageToken = nextPageToken;
          if (isFirstPage) {
            isFirstPage = false;
          }
        } catch (pageError) {
          if (String(pageError).includes('AUTH_REVOKED')) {
            return c.json({ success: false, error: 'Gmail authentication revoked' }, 403);
          }
          errors.push(`Pagination error: ${String(pageError)}`);
          break;
        }
      } while (pageToken);

      // Update last sync timestamp
      await dbService.updateUser(user.user_id, {
        last_email_sync: new Date().toISOString(),
      });

      return c.json({ success: true, data: { synced_count: syncedCount, errors } });
    } catch (error) {
      console.error('Sync error:', error);
      return c.json({ success: false, error: 'Sync failed: ' + String(error) }, 500);
    }
  });

  // List emails endpoint
  router.get('/list', zValidator('query', emailListSchema), async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const { limit, offset, sort, filter_unread, filter_starred } = c.req.valid('query');

      const { emails, total } = await dbService.listEmails(user.user_id, limit, offset, {
        is_unread: filter_unread,
        is_starred: filter_starred,
      });

      const response = emails.map((email) => ({
        id: email.email_id,
        gmail_id: email.gmail_message_id,
        sender_email: email.sender_email,
        sender_name: email.sender_name,
        subject: email.subject,
        preview: email.body_plain?.slice(0, 100) || email.body_html?.slice(0, 100) || '(No content)',
        received_date: email.received_date,
        is_read: email.is_read,
        is_starred: email.is_starred,
        labels: [],
      }));

      return c.json({
        success: true,
        data: {
          emails: response,
          total_count: total,
          has_more: offset + limit < total,
        },
      });
    } catch (error) {
      console.error('List error:', error);
      return c.json({ success: false, error: 'Failed to list emails' }, 500);
    }
  });

  // Get single email endpoint
  router.get('/:id', async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const emailId = c.req.param('id');
      const email = await dbService.getEmailById(emailId, user.user_id);

      if (!email) {
        return c.json({ success: false, error: 'Email not found' }, 404);
      }

      // Mark as read
      if (!email.is_read) {
        await dbService.updateEmail(emailId, user.user_id, { is_read: true });
      }

      const labels = await dbService.getLabelsForEmail(emailId);
      const attachments = await dbService.getAttachmentsForEmail(emailId);

      return c.json({
        success: true,
        data: {
          id: email.email_id,
          subject: email.subject,
          from: `${email.sender_name} <${email.sender_email}>`,
          to: '(recipient)',
          cc: null,
          bcc: null,
          date: email.received_date,
          body_html: email.body_html,
          body_plain: email.body_plain,
          attachments: attachments.map((a) => ({
            id: a.id,
            filename: a.filename,
            mimetype: a.mimetype,
            size: a.size,
          })),
          thread_id: email.thread_id,
          labels,
          is_read: true,
          is_starred: email.is_starred,
          is_archived: email.is_archived,
        },
      });
    } catch (error) {
      console.error('Get email error:', error);
      return c.json({ success: false, error: 'Failed to get email' }, 500);
    }
  });

  // Update email endpoint
  router.put('/:id', zValidator('json', emailUpdateSchema), async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const emailId = c.req.param('id');
      const updates = c.req.valid('json');

      const email = await dbService.getEmailById(emailId, user.user_id);
      if (!email) {
        return c.json({ success: false, error: 'Email not found' }, 404);
      }

      const dbUser = await dbService.getUserById(user.user_id);
      if (!dbUser?.google_access_token) {
        return c.json({ success: false, error: 'Gmail not connected' }, 403);
      }

      // Update in Gmail
      try {
        const decryptedToken = await tokenService.decrypt(dbUser.google_access_token);
        const addLabels = [];
        const removeLabels = [];

        if (updates.is_starred !== undefined) {
          if (updates.is_starred) {
            addLabels.push('STARRED');
          } else {
            removeLabels.push('STARRED');
          }
        }

        if (updates.is_read !== undefined) {
          if (updates.is_read) {
            removeLabels.push('UNREAD');
          } else {
            addLabels.push('UNREAD');
          }
        }

        if (addLabels.length > 0 || removeLabels.length > 0) {
          await gmailService.modifyMessage(decryptedToken, email.gmail_message_id, addLabels, removeLabels);
        }
      } catch (gmailError) {
        if (String(gmailError).includes('AUTH_REVOKED')) {
          return c.json({ success: false, error: 'Gmail authentication revoked' }, 403);
        }
        console.error('Gmail update error:', gmailError);
      }

      // Update in database
      const updated = await dbService.updateEmail(emailId, user.user_id, updates);

      return c.json({
        success: true,
        data: {
          id: updated.email_id,
          is_read: updated.is_read,
          is_starred: updated.is_starred,
          is_archived: updated.is_archived,
        },
      });
    } catch (error) {
      console.error('Update error:', error);
      return c.json({ success: false, error: 'Failed to update email' }, 500);
    }
  });

  // Delete email endpoint
  router.delete('/:id', async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const emailId = c.req.param('id');
      const email = await dbService.getEmailById(emailId, user.user_id);

      if (!email) {
        return c.json({ success: false, error: 'Email not found' }, 404);
      }

      const dbUser = await dbService.getUserById(user.user_id);
      if (dbUser?.google_access_token) {
        try {
          const decryptedToken = await tokenService.decrypt(dbUser.google_access_token);
          await gmailService.deleteMessage(decryptedToken, email.gmail_message_id);
        } catch (gmailError) {
          if (String(gmailError).includes('AUTH_REVOKED')) {
            return c.json({ success: false, error: 'Gmail authentication revoked' }, 403);
          }
          console.error('Gmail delete error:', gmailError);
        }
      }

      await dbService.updateEmail(emailId, user.user_id, { is_deleted: true });

      return c.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      return c.json({ success: false, error: 'Failed to delete email' }, 500);
    }
  });

  // Search emails endpoint
  router.post('/search', zValidator('json', searchSchema), async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const { query, filters } = c.req.valid('json');

      let results = await dbService.searchEmails(user.user_id, query);

      // Apply additional filters if provided
      if (filters) {
        results = results.filter((email) => {
          if (filters.is_unread && email.is_read) return false;
          if (filters.is_starred && !email.is_starred) return false;
          if (filters.from && !email.sender_email.includes(filters.from)) return false;
          if (filters.date_from && new Date(email.received_date) < new Date(filters.date_from))
            return false;
          if (filters.date_to && new Date(email.received_date) > new Date(filters.date_to)) return false;
          return true;
        });
      }

      return c.json({
        success: true,
        data: {
          results: results.map((email) => ({
            id: email.email_id,
            gmail_id: email.gmail_message_id,
            sender_email: email.sender_email,
            sender_name: email.sender_name,
            subject: email.subject,
            preview: email.body_plain?.slice(0, 100) || '',
            received_date: email.received_date,
            is_read: email.is_read,
            is_starred: email.is_starred,
            labels: [],
          })),
        },
      });
    } catch (error) {
      console.error('Search error:', error);
      return c.json({ success: false, error: 'Search failed' }, 500);
    }
  });

  // Reply endpoint
  router.post('/reply', zValidator('json', replySchema), async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const { reply_to_email_id, body_text, body_html } = c.req.valid('json');

      const email = await dbService.getEmailById(reply_to_email_id, user.user_id);
      if (!email) {
        return c.json({ success: false, error: 'Email not found' }, 404);
      }

      const dbUser = await dbService.getUserById(user.user_id);
      if (!dbUser?.google_access_token) {
        return c.json({ success: false, error: 'Gmail not connected' }, 403);
      }

      const decryptedToken = await tokenService.decrypt(dbUser.google_access_token);

      // Build MIME message for reply
      const messageBody = this.buildMimeMessage({
        to: email.sender_email,
        subject: `Re: ${email.subject}`,
        body: body_html || body_text,
        threadId: email.thread_id,
      });

      const messageId = await gmailService.sendMessage(decryptedToken, messageBody);

      return c.json({
        success: true,
        data: { success: true, sent_at: new Date().toISOString(), message_id: messageId },
      });
    } catch (error) {
      if (String(error).includes('AUTH_REVOKED')) {
        return c.json({ success: false, error: 'Gmail authentication revoked' }, 403);
      }
      console.error('Reply error:', error);
      return c.json({ success: false, error: 'Failed to send reply' }, 500);
    }
  });

  // Forward endpoint
  router.post('/forward', zValidator('json', forwardSchema), async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const { forward_email_id, recipients, subject, body_text } = c.req.valid('json');

      const email = await dbService.getEmailById(forward_email_id, user.user_id);
      if (!email) {
        return c.json({ success: false, error: 'Email not found' }, 404);
      }

      const dbUser = await dbService.getUserById(user.user_id);
      if (!dbUser?.google_access_token) {
        return c.json({ success: false, error: 'Gmail not connected' }, 403);
      }

      const decryptedToken = await tokenService.decrypt(dbUser.google_access_token);

      // Build MIME message for forward
      const messageBody = this.buildMimeMessage({
        to: recipients[0],
        subject: subject || `Fwd: ${email.subject}`,
        body: `${body_text || ''}\n\n---------- Forwarded message ---------\n${email.body_plain || email.body_html || ''}`,
      });

      const messageId = await gmailService.sendMessage(decryptedToken, messageBody);

      return c.json({
        success: true,
        data: { success: true, sent_at: new Date().toISOString(), message_id: messageId },
      });
    } catch (error) {
      if (String(error).includes('AUTH_REVOKED')) {
        return c.json({ success: false, error: 'Gmail authentication revoked' }, 403);
      }
      console.error('Forward error:', error);
      return c.json({ success: false, error: 'Failed to forward email' }, 500);
    }
  });

  return router;
}

// Helper function to build MIME messages
function buildMimeMessage(options: {
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
}): string {
  return `To: ${options.to}\nSubject: ${options.subject}\nMIME-Version: 1.0\nContent-Type: text/plain; charset=utf-8\n\n${options.body}`;
}
