import type { OAuth2Tokens } from 'better-auth/oauth2'

export function parseTokens(value: unknown, startedAt = Date.now()): OAuth2Tokens {
	const tokens = value as Record<string, unknown> | null
	if (
		!tokens ||
		typeof tokens.access_token !== 'string' ||
		!tokens.access_token ||
		typeof tokens.refresh_token !== 'string' ||
		!tokens.refresh_token ||
		typeof tokens.token_type !== 'string' ||
		tokens.token_type.toLowerCase() !== 'bearer' ||
		typeof tokens.expires_in !== 'number' ||
		!Number.isFinite(tokens.expires_in) ||
		tokens.expires_in <= 0
	) {
		throw new Error('Invalid OAuth token response')
	}
	return {
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		tokenType: tokens.token_type,
		accessTokenExpiresAt: new Date(startedAt + tokens.expires_in * 1000),
	}
}

export function parseProfile(value: unknown) {
	const attributes = (value as { attributes?: Record<string, unknown> } | null)?.attributes
	if (!attributes || typeof attributes.id !== 'string' || !attributes.id || attributes.id.includes('/')) {
		throw new Error('Missing or invalid account ID')
	}
	const name = [attributes.name, attributes.displayName, attributes.display_name].find((value): value is string => typeof value === 'string' && !!value) || attributes.id
	return { id: attributes.id, accountId: attributes.id, email: attributes.id, name, emailVerified: false }
}

export async function requestTokens(path: string, params: Record<string, string>): Promise<OAuth2Tokens> {
	const clientId = process.env.CLIENT_ID || ''
	const clientSecret = process.env.CLIENT_SECRET || ''
	if (!clientId || !clientSecret || !process.env.API_ORIGIN) throw new Error('Missing TIPS OAuth configuration')
	const encode = (value: string) => new URLSearchParams({ value }).toString().slice('value='.length)
	const startedAt = Date.now()
	const response = await fetch(new URL(path, process.env.API_ORIGIN), {
		method: 'POST',
		cache: 'no-store',
		redirect: 'error',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${Buffer.from(`${encode(clientId)}:${encode(clientSecret)}`).toString('base64')}`,
		},
		body: new URLSearchParams({ ...params, client_id: clientId }),
	})
	if (!response.ok) throw new Error(`OAuth token request failed (${response.status})`)
	return parseTokens(await response.json(), startedAt)
}

// Share concurrent refreshes of the same rotating token within this process.
const refreshRequests = new Map<string, Promise<OAuth2Tokens>>()
export async function refreshTipsToken(refreshToken: string): Promise<OAuth2Tokens> {
	let request = refreshRequests.get(refreshToken)
	if (!request) {
		request = requestTokens('/v3/refresh', { grant_type: 'refresh_token', refresh_token: refreshToken })
		refreshRequests.set(refreshToken, request)
	}
	try {
		return await request
	} finally {
		if (refreshRequests.get(refreshToken) === request) refreshRequests.delete(refreshToken)
	}
}
