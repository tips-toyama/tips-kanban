import { type BetterAuthPlugin, betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { parseProfile, refreshTipsToken, requestTokens } from './tips-oauth'

// TIPS uses a separate endpoint for refresh-token grants.
const tipsRefresh = {
	id: 'tips-refresh',
	init(ctx) {
		return {
			context: {
				socialProviders: ctx.socialProviders.map((provider) => (provider.id === 'tips' ? { ...provider, refreshAccessToken: refreshTipsToken } : provider)),
			},
		}
	},
} satisfies BetterAuthPlugin

async function ensureUser(profile: ReturnType<typeof parseProfile>) {
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
	const ref = db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(profile.id)
	await db.runTransaction(async (transaction) => {
		if (!(await transaction.get(ref)).exists) {
			transaction.create(ref, { id: profile.id, name: profile.name, joined: [] })
		}
	})
}

export function createAuth(syncUser = ensureUser) {
	return betterAuth({
		baseURL: process.env.BETTER_AUTH_URL,
		secret: process.env.BETTER_AUTH_SECRET,
		// Keep provider identity immutable and OAuth tokens server-only.
		disabledPaths: ['/update-user', '/get-access-token', '/refresh-token', '/account-info'],
		// Keep provider credentials in an encrypted HTTP-only account cookie.
		session: {
			cookieCache: { enabled: true, strategy: 'jwe', maxAge: 60 * 60 * 24 * 7, refreshCache: true },
		},
		account: { storeStateStrategy: 'cookie', storeAccountCookie: true, accountLinking: { enabled: false } },
		user: {
			// The provider ID is case-sensitive; Better Auth normalizes email addresses.
			additionalFields: { accountId: { type: 'string', required: true } },
		},
		plugins: [
			genericOAuth({
				config: [
					{
						providerId: 'tips',
						name: 'TIPSアカウント',
						clientId: process.env.CLIENT_ID || '',
						clientSecret: process.env.CLIENT_SECRET || '',
						authorizationUrl: `${process.env.API_ORIGIN}/v3/login/authorize`,
						tokenUrl: `${process.env.API_ORIGIN}/v3/login/token`,
						pkce: true,
						getToken: async ({ code, redirectURI, codeVerifier }) => {
							if (!codeVerifier) throw new Error('Missing PKCE verifier')
							return requestTokens('/v3/login/token', {
								grant_type: 'authorization_code',
								code,
								redirect_uri: redirectURI,
								code_verifier: codeVerifier,
							})
						},
						getUserInfo: async (tokens) => {
							const response = await fetch(`${process.env.API_ORIGIN}/v1/account/get_credential`, {
								headers: { Authorization: `Bearer ${tokens.accessToken}` },
								cache: 'no-store',
								redirect: 'error',
							})
							if (!response.ok) throw new Error(`Account profile request failed (${response.status})`)
							const profile = parseProfile(await response.json())
							await syncUser(profile)
							return profile
						},
						mapProfileToUser: (profile) => ({ accountId: profile.accountId as string }),
					},
				],
			}),
			tipsRefresh,
		],
	})
}

export const auth = createAuth()
