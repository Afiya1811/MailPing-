import { Context, Next } from 'hono';
import { JWTPayload } from '../types/index';

// Simple JWT implementation for Cloudflare Workers
export class JWTManager {
  private secretKey: CryptoKey | null = null;
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  async initialize(): Promise<void> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.secret.padEnd(32, '0').slice(0, 32));

      this.secretKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );
    } catch (error) {
      throw new Error('Failed to initialize JWTManager: ' + String(error));
    }
  }

  async sign(payload: JWTPayload): Promise<string> {
    if (!this.secretKey) {
      throw new Error('JWTManager not initialized');
    }

    try {
      const header = { alg: 'HS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 86400 * 7; // 7 days

      const token_payload: JWTPayload = {
        ...payload,
        iat: now,
        exp,
      };

      const headerEncoded = this.base64url(JSON.stringify(header));
      const payloadEncoded = this.base64url(JSON.stringify(token_payload));
      const message = `${headerEncoded}.${payloadEncoded}`;

      const messageData = new TextEncoder().encode(message);
      const signature = await crypto.subtle.sign('HMAC', this.secretKey, messageData);
      const signatureEncoded = this.base64url(Buffer.from(signature).toString('binary'));

      return `${message}.${signatureEncoded}`;
    } catch (error) {
      throw new Error('JWT signing failed: ' + String(error));
    }
  }

  async verify(token: string): Promise<JWTPayload | null> {
    if (!this.secretKey) {
      throw new Error('JWTManager not initialized');
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
      const message = `${headerEncoded}.${payloadEncoded}`;

      const messageData = new TextEncoder().encode(message);
      const signature = Buffer.from(this.base64decode(signatureEncoded), 'binary');

      const isValid = await crypto.subtle.verify('HMAC', this.secretKey, signature, messageData);
      if (!isValid) {
        return null;
      }

      const payload: JWTPayload = JSON.parse(this.base64decode(payloadEncoded));

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Token expired
      }

      return payload;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  private base64url(input: string): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private base64decode(input: string): string {
    const output = input
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');
    return Buffer.from(output, 'base64').toString('binary');
  }
}

// Auth middleware
export const authMiddleware = (jwtManager: JWTManager) => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.slice(7);
    const payload = await jwtManager.verify(token);

    if (!payload) {
      return c.json({ success: false, error: 'Invalid or expired token' }, 401);
    }

    c.set('user', payload);
    await next();
  };
};

// Extract user from context
export const getUser = (c: Context): JWTPayload | null => {
  return c.get('user') || null;
};
