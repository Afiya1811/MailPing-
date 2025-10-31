import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createAuthRoutes } from './routes/auth';
import { createEmailRoutes } from './routes/emails';
import { createNotificationRoutes } from './routes/notifications';
import { GmailService } from './services/gmail';
import { DatabaseService } from './services/database';
import { JWTManager } from './middleware/auth';
import { authMiddleware } from './middleware/auth';
import { tokenService } from './services/token';

const app = new Hono();

// Middleware
app.use(logger());
app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Initialize services
let jwtManager: JWTManager;
let gmailService: GmailService;
let dbService: DatabaseService;
let initialized = false;

// Initialization middleware
app.use(async (c, next) => {
  if (!initialized) {
    try {
      const env = c.env as any;

      // Initialize services
      await tokenService.initialize(env.ENCRYPTION_KEY || 'default-key');
      jwtManager = new JWTManager(env.JWT_SECRET || 'default-secret');
      await jwtManager.initialize();

      gmailService = new GmailService(
        env.GOOGLE_OAUTH_CLIENT_ID || '',
        env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:8787/api/auth/google/callback'
      );

      dbService = new DatabaseService(env.DB);

      initialized = true;
    } catch (error) {
      console.error('Initialization error:', error);
      return c.json({ success: false, error: 'Service initialization failed' }, 500);
    }
  }

  await next();
});

// Auth routes (no authentication required)
app.route('/api/auth', createAuthRoutes(gmailService, dbService, jwtManager));

// Email routes (authentication required)
const emailRouter = new Hono();
emailRouter.use(authMiddleware(jwtManager));
emailRouter.route('/', createEmailRoutes(gmailService, dbService));
app.route('/api/emails', emailRouter);

// Notification routes
app.route('/api/notifications', createNotificationRoutes(gmailService, dbService));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((error, c) => {
  console.error('Unhandled error:', error);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default app;
