import { GmailMessage, GmailToken } from '../types/index';

export class GmailService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(state: string): string {
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  }

  async exchangeCodeForTokens(code: string): Promise<GmailToken> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        expiry_date: Date.now() + data.expires_in * 1000,
      };
    } catch (error) {
      throw new Error('OAuth token exchange failed: ' + String(error));
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<GmailToken> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json() as {
        access_token: string;
        expires_in: number;
      };

      return {
        access_token: data.access_token,
        refresh_token: refreshToken,
        expiry_date: Date.now() + data.expires_in * 1000,
      };
    } catch (error) {
      throw new Error('Token refresh failed: ' + String(error));
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: accessToken }).toString(),
      });
    } catch (error) {
      console.error('Token revocation failed:', error);
      // Don't throw - best effort
    }
  }

  async getMessages(accessToken: string, pageToken?: string): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
    try {
      const url = new URL('https://www.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.set('maxResults', '100');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        throw new Error('AUTH_REVOKED');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const data = await response.json() as {
        messages?: GmailMessage[];
        nextPageToken?: string;
      };

      return {
        messages: data.messages || [],
        nextPageToken: data.nextPageToken,
      };
    } catch (error) {
      throw new Error('Failed to fetch Gmail messages: ' + String(error));
    }
  }

  async getMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
    try {
      const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        throw new Error('AUTH_REVOKED');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch message: ${response.status}`);
      }

      return await response.json() as GmailMessage;
    } catch (error) {
      throw new Error('Failed to fetch Gmail message: ' + String(error));
    }
  }

  async modifyMessage(
    accessToken: string,
    messageId: string,
    addLabels?: string[],
    removeLabels?: string[]
  ): Promise<void> {
    try {
      const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: addLabels || [],
          removeLabelIds: removeLabels || [],
        }),
      });

      if (response.status === 401) {
        throw new Error('AUTH_REVOKED');
      }

      if (!response.ok) {
        throw new Error(`Failed to modify message: ${response.status}`);
      }
    } catch (error) {
      throw new Error('Failed to modify Gmail message: ' + String(error));
    }
  }

  async deleteMessage(accessToken: string, messageId: string): Promise<void> {
    try {
      const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/trash`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        throw new Error('AUTH_REVOKED');
      }

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.status}`);
      }
    } catch (error) {
      throw new Error('Failed to delete Gmail message: ' + String(error));
    }
  }

  async sendMessage(accessToken: string, messageBody: string): Promise<string> {
    try {
      const url = 'https://www.googleapis.com/gmail/v1/users/me/messages/send';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: Buffer.from(messageBody).toString('base64'),
        }),
      });

      if (response.status === 401) {
        throw new Error('AUTH_REVOKED');
      }

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json() as { id: string };
      return data.id;
    } catch (error) {
      throw new Error('Failed to send Gmail message: ' + String(error));
    }
  }

  async getAttachment(accessToken: string, messageId: string, attachmentId: string): Promise<ArrayBuffer> {
    try {
      const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
        messageId
      )}/attachments/${encodeURIComponent(attachmentId)}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401) {
        throw new Error('AUTH_REVOKED');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch attachment: ${response.status}`);
      }

      const data = await response.json() as { data?: string };
      if (data.data) {
        return Buffer.from(data.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      }

      return new ArrayBuffer(0);
    } catch (error) {
      throw new Error('Failed to fetch Gmail attachment: ' + String(error));
    }
  }

  parseEmailFromMessage(message: GmailMessage): {
    from: string;
    to: string;
    cc: string | null;
    bcc: string | null;
    subject: string;
    sender_email: string;
    sender_name: string;
    body_plain: string | null;
    body_html: string | null;
    received_date: string;
  } {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string): string | null => {
      const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return header?.value || null;
    };

    const from = getHeader('from') || '';
    const [senderName, senderEmail] = this.parseEmailHeader(from);

    const subject = getHeader('subject') || '(No subject)';
    const date = getHeader('date') || new Date().toISOString();
    const to = getHeader('to') || '';
    const cc = getHeader('cc');
    const bcc = getHeader('bcc');

    const { bodyPlain, bodyHtml } = this.parseMessageBody(message.payload);

    return {
      from,
      to,
      cc,
      bcc,
      subject,
      sender_email: senderEmail,
      sender_name: senderName,
      body_plain: bodyPlain,
      body_html: bodyHtml,
      received_date: new Date(date).toISOString(),
    };
  }

  private parseEmailHeader(header: string): [string, string] {
    // Parse "Name <email@example.com>" format
    const match = header.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return [match[1].trim(), match[2].trim()];
    }
    // Just email
    return ['', header.trim()];
  }

  private parseMessageBody(
    payload: any
  ): { bodyPlain: string | null; bodyHtml: string | null } {
    let bodyPlain: string | null = null;
    let bodyHtml: string | null = null;

    if (payload.body?.data) {
      const data = Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
      if (payload.mimeType === 'text/plain') {
        bodyPlain = data;
      } else if (payload.mimeType === 'text/html') {
        bodyHtml = data;
      }
    }

    // Check parts for multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyPlain = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        }
      }
    }

    return { bodyPlain, bodyHtml };
  }
}
