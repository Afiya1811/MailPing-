import { storage } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const token = storage.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          storage.clearToken();
          window.location.href = '/auth';
        }
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async googleCallback(code: string, state?: string): Promise<ApiResponse<{ token: string }>> {
    return this.request<{ token: string }>(
      `/auth/google/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`
    );
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/logout', { method: 'POST' });
  }

  // Email endpoints
  async syncEmails(): Promise<
    ApiResponse<{ synced_count: number; errors: string[] }>
  > {
    return this.request('/emails/sync', { method: 'POST' });
  }

  async listEmails(
    limit: number = 50,
    offset: number = 0,
    filters?: { is_unread?: boolean; is_starred?: boolean }
  ): Promise<
    ApiResponse<{
      emails: any[];
      total_count: number;
      has_more: boolean;
    }>
  > {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(filters?.is_unread && { filter_unread: 'true' }),
      ...(filters?.is_starred && { filter_starred: 'true' }),
    });

    return this.request(`/emails/list?${params.toString()}`);
  }

  async getEmail(id: string): Promise<ApiResponse<any>> {
    return this.request(`/emails/${encodeURIComponent(id)}`);
  }

  async updateEmail(
    id: string,
    updates: { is_read?: boolean; is_starred?: boolean; is_archived?: boolean }
  ): Promise<ApiResponse<any>> {
    return this.request(`/emails/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteEmail(id: string): Promise<ApiResponse<void>> {
    return this.request(`/emails/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async searchEmails(
    query: string,
    filters?: {
      is_unread?: boolean;
      is_starred?: boolean;
      date_from?: string;
      date_to?: string;
      labels?: string[];
      from?: string;
    }
  ): Promise<ApiResponse<{ results: any[] }>> {
    return this.request('/emails/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  async replyToEmail(
    emailId: string,
    bodyText: string,
    bodyHtml?: string
  ): Promise<ApiResponse<{ success: boolean; sent_at: string }>> {
    return this.request('/emails/reply', {
      method: 'POST',
      body: JSON.stringify({ reply_to_email_id: emailId, body_text: bodyText, body_html: bodyHtml }),
    });
  }

  async forwardEmail(
    emailId: string,
    recipients: string[],
    subject?: string,
    bodyText?: string
  ): Promise<ApiResponse<{ success: boolean; sent_at: string }>> {
    return this.request('/emails/forward', {
      method: 'POST',
      body: JSON.stringify({
        forward_email_id: emailId,
        recipients,
        subject,
        body_text: bodyText,
      }),
    });
  }
}

export const apiClient = new ApiClient();
