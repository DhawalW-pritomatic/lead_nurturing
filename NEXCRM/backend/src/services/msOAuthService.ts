interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

class MsOAuthService {
  private cache: TokenCache | null = null;

  async getImapAccessToken(): Promise<string> {
    // Return cached token if still valid (60s safety buffer before expiry)
    if (this.cache && Date.now() < this.cache.expiresAt - 60_000) {
      return this.cache.accessToken;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Missing Azure OAuth2 credentials (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET).');
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://outlook.office365.com/.default',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const detail = data?.error_description || data?.error || JSON.stringify(data);
      throw new Error(`Azure token fetch failed: ${detail}`);
    }

    this.cache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in as number) * 1000,
    };

    console.log('[MsOAuth] Access token refreshed, expires in', data.expires_in, 's');
    return this.cache.accessToken;
  }
}

export const msOAuthService = new MsOAuthService();
