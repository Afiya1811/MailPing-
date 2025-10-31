import { Hono } from 'hono';
import { GmailService } from '../services/gmail';
import { DatabaseService } from '../services/database';
import { JWTManager } from '../middleware/auth';
import { tokenService } from '../services/token';
import { getUser } from '../middleware/auth';
import { v4 as uuidv4 } from 'crypto';

export function createAuthRoutes(
  gmailService: GmailService,
  dbService: DatabaseService,
  jwtManager: JWTManager
): Hono {
  const router = new Hono();

  // Google OAuth callback
  router.get('/google/callback', async (c) => {
    try {
      const code = c.req.query('code');
      const state = c.req.query('state');

      if (!code) {
        return c.json({ success: false, error: 'Missing authorization code' }, 400);
      }

      // Exchange code for tokens
      const tokens = await gmailService.exchangeCodeForTokens(code);
      if (!tokens) {
        return c.json({ success: false, error: 'Invalid authorization code' }, 400);
      }

      // Get user profile from Mocha (or create one)
      // For now, we'll extract email from JWT or assume from token
      // In production, fetch user profile from id token
      const emailMatch = state ? state.split('|')[0] : null;

      let user = await dbService.getUserByGoogleEmail(emailMatch || '');

      if (!user) {
        // Create new user
        const userId = uuidv4();
        const encryptedAccessToken = await tokenService.encrypt(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
          ? await tokenService.encrypt(tokens.refresh_token)
          : null;

        user = await dbService.createUser({
          user_id: userId,
          email: emailMatch || `user+${userId}@mailping.local`,
          name: '',
          google_email: emailMatch,
          google_access_token: encryptedAccessToken,
          google_refresh_token: encryptedRefreshToken,
          token_expiry: new Date(tokens.expiry_date).toISOString(),
          last_email_sync: null,
          last_notification_check: null,
        });
      } else {
        // Update existing user with new tokens
        const encryptedAccessToken = await tokenService.encrypt(tokens.access_token);
        const encryptedRefreshToken = tokens.refresh_token
          ? await tokenService.encrypt(tokens.refresh_token)
          : user.google_refresh_token;

        user = await dbService.updateUser(user.user_id, {
          google_access_token: encryptedAccessToken,
          google_refresh_token: encryptedRefreshToken,
          token_expiry: new Date(tokens.expiry_date).toISOString(),
        });
      }

      // Generate JWT session token
      const jwtToken = await jwtManager.sign({
        user_id: user.user_id,
        email: user.email,
        iat: 0,
        exp: 0,
      });

      // Redirect to dashboard with token
      const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
      return c.redirect(`${frontendUrl}/dashboard?token=${encodeURIComponent(jwtToken)}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
      return c.redirect(
        `${frontendUrl}/auth?error=${encodeURIComponent('Authentication failed: ' + String(error))}`
      );
    }
  });

  // Logout endpoint
  router.post('/logout', async (c) => {
    try {
      const user = getUser(c);
      if (!user) {
        return c.json({ success: false, error: 'Not authenticated' }, 401);
      }

      const dbUser = await dbService.getUserById(user.user_id);
      if (!dbUser) {
        return c.json({ success: false, error: 'User not found' }, 404);
      }

      // Attempt to revoke Google tokens (best effort)
      if (dbUser.google_access_token) {
        try {
          const decryptedToken = await tokenService.decrypt(dbUser.google_access_token);
          await gmailService.revokeToken(decryptedToken);
        } catch (error) {
          console.error('Failed to revoke Google token:', error);
          // Continue anyway
        }
      }

      // Clear user's Google tokens from database
      await dbService.updateUser(user.user_id, {
        google_access_token: null,
        google_refresh_token: null,
        token_expiry: null,
      });

      return c.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      return c.json({ success: false, error: 'Logout failed' }, 500);
    }
  });

  return router;
}
