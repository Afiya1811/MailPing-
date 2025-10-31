import { Hono } from 'hono';
import { GmailService } from '../services/gmail';
import { DatabaseService } from '../services/database';
import { tokenService } from '../services/token';
import { v4 as uuidv4 } from 'crypto';

export function createNotificationRoutes(
  gmailService: GmailService,
  dbService: DatabaseService
): Hono {
  const router = new Hono();

  // Check for new emails endpoint (called by backend worker)
  router.post('/check-new', async (c) => {
    try {
      let totalProcessed = 0;
      let totalNewEmails = 0;

      // Get all active users who have Gmail connected
      const allUsersResult = await dbService.getActiveUsers();

      for (const user of allUsersResult) {
        try {
          if (!user.google_access_token) {
            continue;
          }

          const now = new Date();
          let checkSince = user.last_notification_check
            ? new Date(user.last_notification_check)
            : new Date(now.getTime() - 30000); // Default to last 30 seconds

          try {
            const decryptedToken = await tokenService.decrypt(user.google_access_token);

            // Fetch messages since last check
            const { messages } = await gmailService.getMessages(decryptedToken);

            for (const message of messages) {
              const existing = await dbService.getEmailByGmailMessageId(
                message.id,
                user.user_id
              );

              if (!existing) {
                try {
                  // Fetch full message
                  const fullMessage = await gmailService.getMessage(decryptedToken, message.id);
                  const parsed = gmailService.parseEmailFromMessage(fullMessage);

                  // Create email in database
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

                  // Log notification intent
                  await dbService.logNotification({
                    id: uuidv4(),
                    user_id: user.user_id,
                    email_id: emailId,
                    notification_type: 'in_app',
                    notification_sent_at: new Date().toISOString(),
                  });

                  totalNewEmails++;
                } catch (msgError) {
                  console.error(`Failed to process new message ${message.id}:`, msgError);
                }
              }

              totalProcessed++;
            }
          } catch (fetchError) {
            if (String(fetchError).includes('AUTH_REVOKED')) {
              // Mark user as needing re-authentication
              console.log(`User ${user.user_id} needs to re-authenticate`);
            } else {
              console.error(`Error checking emails for user ${user.user_id}:`, fetchError);
            }
            continue;
          }

          // Update last check timestamp
          await dbService.updateUser(user.user_id, {
            last_notification_check: new Date().toISOString(),
          });
        } catch (userError) {
          console.error(`Error processing user ${user.user_id}:`, userError);
          continue;
        }
      }

      return c.json({
        success: true,
        data: {
          new_emails_count: totalNewEmails,
          processed_count: totalProcessed,
        },
      });
    } catch (error) {
      console.error('Notification check error:', error);
      return c.json({ success: false, error: 'Check failed: ' + String(error) }, 500);
    }
  });

  return router;
}
