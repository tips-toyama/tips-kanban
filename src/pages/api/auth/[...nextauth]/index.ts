import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import type { NextApiRequest, NextApiResponse } from 'next'
import NextAuth, { type AuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { OAuthConfig } from 'next-auth/providers/oauth'

// biome-ignore lint/style/noNonNullAssertion: <explanation>
const clientId = process.env.TIPS_CLIENT_ID!
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const clientSecret = process.env.TIPS_CLIENT_SECRET!
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const apiOrigin = process.env.TIPS_API_ORIGIN!

type AccountAttributes = {
	id: string
	name?: string
	displayName?: string
	display_name?: string
}
type AccountProfile = { attributes: AccountAttributes }
type OAuthTokens = {
	access_token: string
	refresh_token: string
	token_type: string
	expires_in: number
}

function validateTokens(value: unknown): OAuthTokens {
	const tokens = value as OAuthTokens | null
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
	return tokens
}

const provider: OAuthConfig<AccountProfile> = {
	id: 'tips',
	name: 'TIPSアカウント',
	type: 'oauth',
	clientId,
	clientSecret,
	idToken: false,
	// NextAuth generates S256 PKCE and state, validates them before exchange,
	// and consumes their short-lived, HTTP-only cookies at the callback.
	checks: ['pkce', 'state'],
	client: { token_endpoint_auth_method: 'client_secret_basic' },
	authorization: {
		url: `${apiOrigin}/v3/login/authorize`,
		params: { response_type: 'code' },
	},
	token: {
		url: `${apiOrigin}/v3/login/token`,
		async request({ client, provider, params, checks }) {
			// Keep openid-client's state validation and PKCE exchange. It form-encodes
			// both Basic credentials and the token body without sending client_secret there.
			const tokens = await client.oauthCallback(provider.callbackUrl, params, checks)
			validateTokens(tokens)
			return { tokens }
		},
	},
	userinfo: {
		url: `${apiOrigin}/v1/account/get_credential`,
		async request({ tokens }) {
			const response = await fetch(`${apiOrigin}/v1/account/get_credential`, {
				headers: { Authorization: `Bearer ${tokens.access_token}` },
				cache: 'no-store',
				redirect: 'error',
			})
			if (!response.ok) throw new Error(`Account profile request failed (${response.status})`)
			return response.json()
		},
	},
	profile(profile) {
		const attributes = profile.attributes
		if (typeof attributes?.id !== 'string' || !attributes.id) throw new Error('Missing account ID')
		return {
			id: attributes.id,
			// Existing board membership uses session.user.email as the account ID.
			email: attributes.id,
			name: attributes.name || attributes.displayName || attributes.display_name,
		}
	},
}

const refreshRequests = new Map<string, Promise<OAuthTokens & { expiresAt: number }>>()

async function refreshAccessToken(token: JWT): Promise<JWT> {
	if (typeof token.refreshToken !== 'string' || !token.refreshToken) throw new Error('Login required')
	const refreshToken = token.refreshToken
	let request = refreshRequests.get(refreshToken)
	if (!request) {
		request = (async () => {
			const encode = (value: string) => new URLSearchParams({ value }).toString().slice('value='.length)
			const startedAt = Date.now()
			const response = await fetch(`${apiOrigin}/v3/refresh`, {
				method: 'POST',
				cache: 'no-store',
				redirect: 'error',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${Buffer.from(`${encode(clientId)}:${encode(clientSecret)}`).toString('base64')}`,
				},
				body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken }),
			})
			if (!response.ok) throw new Error(`OAuth refresh failed (${response.status}); login required`)
			const tokens = validateTokens(await response.json())
			return { ...tokens, expiresAt: startedAt + tokens.expires_in * 1000 }
		})()
		refreshRequests.set(refreshToken, request)
	}
	try {
		const tokens = await request
		return { ...token, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, accessTokenExpires: tokens.expiresAt }
	} finally {
		if (refreshRequests.get(refreshToken) === request) refreshRequests.delete(refreshToken)
	}
}

export const authOptions: AuthOptions = {
	// OAuth tokens stay in the encrypted NextAuth JWT, never in the browser session response.
	providers: [provider],
	pages: {
		signIn: '/login',
	},
	callbacks: {
		async jwt({ token, account }) {
			if (account) {
				return {
					...token,
					accessToken: account.access_token,
					refreshToken: account.refresh_token,
					accessTokenExpires: (account.expires_at || 0) * 1000,
				}
			}
			if (typeof token.accessTokenExpires === 'number' && Date.now() < token.accessTokenExpires - 30_000) return token
			// A failed refresh throws so NextAuth clears the session and requires login again.
			return refreshAccessToken(token)
		},
		signIn: async ({ user }) => {
			if (admin.apps.length === 0) {
				admin.initializeApp({
					credential: admin.credential.cert({
						projectId: process.env.FIREBASE_PROJECT_ID,
						clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
						privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
					}),
				})
			}
			const db = getFirestore()
			const isUser = await db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(user.id).get()
			if (isUser.exists) return true
			await db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(user.id).set({
				id: user.id,
				name: user.name,
				joined: [],
			})
			return true
		},
	},
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Cache-Control', 'no-store')
	res.setHeader('Pragma', 'no-cache')
	return NextAuth(req, res, authOptions)
}
