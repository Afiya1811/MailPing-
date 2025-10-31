// Scheduled task for checking new emails every 30 seconds
// This would be triggered by Cloudflare Workers cron

import { GmailService } from '../services/gmail';
import { DatabaseService } from '../services/database';
import { tokenService } from '../services/token';
import { v4 as uuidv4 } from 'crypto';

export async function checkNewEmails(env: any): Promise<void> {
  try {
    // Initialize services
    await tokenService.initialize(env.ENCRYPTION_KEY || 'default-key');
    const gmailService = new GmailService(
      env.GOOGLE_OAUTH_CLIENT_ID || '',
      env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:8787/api/auth/google/callback'
    );
    const dbService = new DatabaseService(env.DB);

    // Get all active users
    const users = await dbService.getActiveUsers();

    for (const user of users) {
      try {
        if (!user.google_access_token) {
          continue;
        }

        const decryptedToken = await tokenService.decrypt(user.google_access_token);

        // Fetch recent messages
        const { messages } = await gmailService.getMessages(decryptedToken);

        for (const message of messages) {
          try {
            const existing = await dbService.getEmailByGmailMessageId(message.id, user.user_id);

            if (!existing) {
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

              // Log notification for frontend to pick up
              await dbService.logNotification({
                id: uuidv4(),
                user_id: user.user_id,
                email_id: emailId,
                notification_type: 'in_app',
                notification_sent_at: new Date().toISOString(),
              });
            }
          } catch (msgError) {
            console.error(`Failed to process message ${message.id}:`, msgError);
          }
        }

        // Update last check timestamp
        await dbService.updateUser(user.user_id, {
          last_notification_check: new Date().toISOString(),
        });
      } catch (userError) {
        if (String(userError).includes('AUTH_REVOKED')) {
          console.log(`User ${user.user_id} needs to re-authenticate`);
        } else {
          console.error(`Error checking emails for user ${user.user_id}:`, userError);
        }
      }
    }

    console.log(`Email check completed for ${users.length} users`);
  } catch (error) {
    console.error('Email checker task failed:', error);
  }
}
