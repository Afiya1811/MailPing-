# MailPing - Gmail Email Management Application

MailPing is a full-stack web application that integrates with Gmail to provide a centralized email management interface with real-time notifications.

## Features

- **Google OAuth Authentication**: Sign up and login with your Google account
- **Gmail Integration**: Fetch and display all your emails from Gmail
- **Email Management**:
  - View full email content with HTML rendering
  - Mark emails as read/unread
  - Star/flag important emails
  - Archive and delete emails
  - Reply to and forward emails
- **Search & Filtering**: Search emails by subject, sender, or content with advanced filters
- **Real-time Notifications**: Get notified when new emails arrive
- **Responsive UI**: Dark-themed interface built with Tailwind CSS
- **Compact Email List**: Efficient email list view with sender, subject, and preview

## Tech Stack

### Backend
- **Runtime**: Cloudflare Workers (Hono 4.7.7)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (for attachments)
- **Authentication**: JWT + Google OAuth2
- **API Framework**: Hono
- **Validation**: Zod

### Frontend
- **Framework**: React 19
- **Routing**: React Router 7
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Date Formatting**: date-fns
- **HTML Sanitization**: DOMPurify

### Gmail Integration
- Gmail API v1
- OAuth2 scopes: `gmail.readonly`, `gmail.modify`
- Polling-based notifications (30-second intervals)

## Project Structure

```
MailPing/
├── src/
│   ├── worker/                 # Cloudflare Worker (Backend)
│   │   ├── index.ts           # Main worker entry point
│   │   ├── db/
│   │   │   └── schema.sql     # Database schema
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.ts        # OAuth and session routes
│   │   │   ├── emails.ts      # Email CRUD operations
│   │   │   └── notifications.ts  # Notification endpoints
│   │   ├── services/
│   │   │   ├── gmail.ts       # Gmail API wrapper
│   │   │   ├── database.ts    # D1 database operations
│   │   │   └── token.ts       # Token encryption
│   │   ├── scheduled/
│   │   │   └── emailChecker.ts # Email polling task
│   │   └── types/
│   │       └── index.ts       # TypeScript types
│   └── react-app/             # React Frontend
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── AuthPage.tsx
│       │   ├── DashboardPage.tsx
│       │   └── EmailViewerPage.tsx
│       ├── components/
│       │   ├── EmailList.tsx
│       │   ├── SearchBar.tsx
│       │   ├── Settings.tsx
│       │   ├── NotificationToast.tsx
│       │   └── EmailCompose.tsx
│       ├── hooks/
│       │   ├── useGmailAuth.ts
│       │   ├── useEmails.ts
│       │   ├── useNotifications.ts
│       │   └── useSearch.ts
│       ├── services/
│       │   ├── api.ts
│       │   ├── notifications.ts
│       │   └── storage.ts
│       └── styles/
│           └── globals.css
├── package.json
├── tsconfig.json
├── wrangler.json          # Cloudflare Worker configuration
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account
- Google Cloud Project with Gmail API enabled

### 1. Clone the Repository
```bash
git clone <repo-url>
cd MailPing
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with:
- `GOOGLE_OAUTH_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_OAUTH_CLIENT_SECRET`: From Google Cloud Console
- `GOOGLE_OAUTH_REDIRECT_URI`: OAuth callback URL (default: http://localhost:8787/api/auth/google/callback)
- `JWT_SECRET`: Generate a secure random string (min 32 chars)
- `ENCRYPTION_KEY`: Generate a secure random string (min 32 chars)
- `FRONTEND_URL`: Frontend URL for redirects

### 4. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (OAuth consent screen + credentials)
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret to `.env`

### 5. Set Up Cloudflare D1 Database

```bash
# Generate types for D1
npm run cf-typegen

# Create database (if needed)
wrangler d1 create mailping-db

# Initialize schema
wrangler d1 execute mailping-db --file src/worker/db/schema.sql
```

### 6. Development

**Terminal 1 - Frontend Dev Server:**
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

**Terminal 2 - Worker Dev Server:**
```bash
wrangler dev --local
```
Backend runs on `http://localhost:8787`

## Database Schema

### Tables
- **users**: User accounts with Google OAuth tokens
- **emails**: Cached email data from Gmail
- **email_labels**: Labels/folders for emails
- **email_attachments**: Email attachments metadata
- **notification_log**: Tracking of sent notifications

See `src/worker/db/schema.sql` for full schema.

## API Endpoints

### Authentication
- `GET /api/auth/google/callback` - OAuth callback handler
- `POST /api/auth/logout` - Logout and revoke tokens

### Emails
- `POST /api/emails/sync` - Sync emails from Gmail
- `GET /api/emails/list` - List emails with filtering
- `GET /api/emails/:id` - Get full email details
- `PUT /api/emails/:id` - Update email flags
- `DELETE /api/emails/:id` - Soft delete email
- `POST /api/emails/search` - Search emails
- `POST /api/emails/reply` - Send reply
- `POST /api/emails/forward` - Forward email

### Notifications
- `POST /api/notifications/check-new` - Poll for new emails

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run build
wrangler deploy
```

### Set Production Environment Variables

In Cloudflare Worker settings, add:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI` (production URL)
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `FRONTEND_URL`

## Key Implementation Details

### Security
- JWT tokens with 7-day expiration
- Google OAuth tokens encrypted at rest
- XSS prevention via HTML sanitization
- User isolation (users only see their own emails)
- Secure token refresh on expiry

### Email Sync Strategy
- Full sync on first login (with pagination)
- Polling-based new email detection (30-second intervals)
- Duplicate prevention via gmail_message_id
- Batch processing to prevent timeouts

### Notifications
- Browser toast notifications (in-app)
- Desktop notifications (Web Notification API)
- UI updates with unread badges
- Notification logging to prevent duplicates

### Error Handling
- Graceful Gmail API errors
- Token expiration/revocation detection
- Retry mechanisms for failed operations
- User-friendly error messages

## Performance Optimizations

- Client-side search filtering
- Email list pagination
- Indexed database queries
- CSS-in-JS with Tailwind for optimal bundling
- Lazy-loaded components in React Router

## Edge Cases Handled

1. **Large inboxes**: Paginated email sync
2. **Gmail authorization revoked**: Detect and prompt re-auth
3. **Token expiration**: Automatic refresh
4. **Duplicate emails**: Prevented with unique constraints
5. **Network failures**: Retry with exponential backoff
6. **HTML email security**: Sanitized before rendering
7. **Multiple browser tabs**: Consistent state via localStorage
8. **Concurrent requests**: Proper error handling and user feedback

## Testing Considerations

- Mock Gmail API responses for development
- Test with 1000+ emails for performance
- Verify token refresh flow
- Test notification timing
- Verify search with special characters
- Test HTML sanitization with malicious content

## Troubleshooting

### OAuth Callback Issues
- Verify `GOOGLE_OAUTH_REDIRECT_URI` matches Google Console
- Check CORS settings in worker

### Database Errors
- Ensure D1 database is initialized
- Run schema migration: `wrangler d1 execute mailping-db --file src/worker/db/schema.sql`

### Gmail API Errors
- Check API is enabled in Google Cloud Console
- Verify OAuth scopes include `gmail.readonly` and `gmail.modify`
- Check rate limiting (Gmail API has quotas)

### Frontend Connectivity
- Verify `VITE_API_URL` points to backend
- Check CORS headers from backend
- Clear browser cache/localStorage if auth token invalid

## Contributing

Contributions are welcome! Please follow:
- TypeScript for type safety
- Existing code patterns and conventions
- Component composition for React
- Database transaction patterns for consistency

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please create a GitHub issue with:
- Clear description of the problem
- Steps to reproduce
- Environment details
- Error logs if applicable
