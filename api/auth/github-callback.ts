/**
 * GitHub OAuth Callback Handler
 * Exchanges OAuth code for access token and stores connection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    error?: string;
    error_description?: string;
}

interface GitHubUser {
    login: string;
    id: number;
    avatar_url: string;
}

interface GitHubInstallation {
    id: number;
    account: {
        login: string;
        id: number;
        type: string;
    };
    repository_selection: 'all' | 'selected';
    permissions: Record<string, string>;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only accept GET (OAuth redirect)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, state, installation_id, setup_action } = req.query;

    // GitHub App installation flow
    if (installation_id && setup_action === 'install') {
        // User just installed the GitHub App
        // Redirect to app with installation ID
        const redirectUrl = new URL(process.env.APP_URL || 'http://localhost:3000');
        redirectUrl.searchParams.set('github_installation', installation_id as string);
        redirectUrl.searchParams.set('status', 'installed');
        return res.redirect(302, redirectUrl.toString());
    }

    // OAuth authorization flow
    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('GitHub OAuth credentials not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });

        const tokenData: TokenResponse = await tokenResponse.json();

        if (tokenData.error) {
            console.error('OAuth error:', tokenData.error_description);
            return res.redirect(302, `${process.env.APP_URL}?error=oauth_failed`);
        }

        // Get user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });

        const userData: GitHubUser = await userResponse.json();

        // Get user's installations (if using GitHub App)
        const installationsResponse = await fetch('https://api.github.com/user/installations', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });

        const installationsData = await installationsResponse.json();

        // Create connection payload to pass back to app
        const connectionData = {
            user: {
                login: userData.login,
                id: userData.id,
                avatar_url: userData.avatar_url,
            },
            installations: installationsData.installations || [],
            token: tokenData.access_token, // In production, encrypt this
            scope: tokenData.scope,
            connectedAt: new Date().toISOString(),
        };

        // Encode connection data for URL
        const encodedData = Buffer.from(JSON.stringify(connectionData)).toString('base64');

        // Redirect back to app with connection data
        const redirectUrl = new URL(process.env.APP_URL || 'http://localhost:3000');
        redirectUrl.searchParams.set('github_connected', 'true');
        redirectUrl.searchParams.set('connection_data', encodedData);

        // Restore state (project ID) if provided
        if (state) {
            redirectUrl.searchParams.set('project_id', state as string);
        }

        return res.redirect(302, redirectUrl.toString());

    } catch (error) {
        console.error('OAuth callback error:', error);
        return res.redirect(302, `${process.env.APP_URL}?error=connection_failed`);
    }
}
