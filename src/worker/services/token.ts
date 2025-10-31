// Token encryption/decryption service for securing Gmail tokens
// Note: In production, use proper key management (e.g., AWS KMS, HashiCorp Vault)

export class TokenService {
  private encryptionKey: CryptoKey | null = null;

  async initialize(keyMaterial: string): Promise<void> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyMaterial.padEnd(32, '0').slice(0, 32));

      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error('Failed to initialize TokenService: ' + String(error));
    }
  }

  async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('TokenService not initialized');
    }

    try {
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(data);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        plaintext
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return Buffer.from(combined).toString('base64');
    } catch (error) {
      throw new Error('Encryption failed: ' + String(error));
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('TokenService not initialized');
    }

    try {
      const combined = Buffer.from(encryptedData, 'base64');
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed: ' + String(error));
    }
  }
}

export const tokenService = new TokenService();
