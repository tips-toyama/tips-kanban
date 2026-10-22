import type { NextApiRequest, NextApiResponse } from 'next'
import {
	AuthError,
	authFetch,
	collection,
	config,
	createSession,
	digest,
	getServerSession,
	randomToken,
	readCookie,
	requireSameOrigin,
	safeReturnPath,
	setCookie,
	tokenHeaders,
} from '../../../../auth/server'

const one = (value: unknown) => (typeof value === 'string' && value ? value : undefined)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Cache-Control', 'no-store')
	res.setHeader('Pragma', 'no-cache')
	res.setHeader('Referrer-Policy', 'no-referrer')
	const route = Array.isArray(req.query.nextauth) ? req.query.nextauth.join('/') : ''
	const method = route === 'signout' ? 'POST' : 'GET'
	if (req.method !== method) {
		res.setHeader('Allow', method)
		return res.status(405).json({ error: 'method_not_allowed' })
	}
	try {
		if (route === 'session') return res.json(await getServerSession(req, res))
		if (route === 'signout') {
			requireSameOrigin(req)
			const id = readCookie(req, 'session')
			if (id) await collection('auth-session').doc(digest(id)).delete()
			setCookie(res, 'session', '', 0)
			return res.json({ url: '/login' })
		}
		if (route === 'signin' || route === 'error') return res.redirect(303, '/login')
		if (route === 'signin/tips') {
			const settings = config()
			const state = randomToken()
			const verifier = randomToken()
			const pending = randomToken()
			const previous = readCookie(req, 'pending')
			if (previous) await collection('auth-pending').doc(digest(previous)).delete()
			await collection('auth-pending')
				.doc(digest(pending))
				.create({ state, verifier, returnTo: safeReturnPath(req.query.callbackUrl), createdAt: Date.now(), cleanupAt: new Date(Date.now() + 600000) })
			setCookie(res, 'pending', pending, 600)
			const url = new URL('/v3/login/authorize', settings.api)
			url.search = new URLSearchParams({
				response_type: 'code',
				client_id: settings.clientId,
				redirect_uri: settings.callback,
				code_challenge: digest(verifier),
				code_challenge_method: 'S256',
				state,
			}).toString()
			return res.redirect(303, url.href)
		}
		if (route === 'callback/tips') {
			const pendingId = readCookie(req, 'pending')
			setCookie(res, 'pending', '', 0)
			const state = one(req.query.state)
			const code = one(req.query.code)
			if (!pendingId || !state) throw new AuthError('invalid_state')
			const ref = collection('auth-pending').doc(digest(pendingId))
			// Atomic consumption across instances prevents duplicate code exchanges.
			const pending = await ref.firestore.runTransaction(async (transaction) => {
				const data = (await transaction.get(ref)).data()
				if (!data || data.state !== state || !Number.isFinite(data.createdAt) || data.createdAt > Date.now() || Date.now() - data.createdAt > 600000) throw new AuthError('invalid_state')
				transaction.delete(ref)
				return data
			})
			if (req.query.error) throw new AuthError('authorization_denied')
			if (!code || !/^[A-Za-z0-9_-]{43}$/.test(code) || Object.keys(req.query).some((key) => !['nextauth', 'code', 'state'].includes(key))) throw new AuthError('invalid_callback')
			const settings = config()
			const tokens = await authFetch('/v3/login/token', {
				method: 'POST',
				headers: tokenHeaders(),
				body: new URLSearchParams({ grant_type: 'authorization_code', client_id: settings.clientId, redirect_uri: settings.callback, code, code_verifier: pending.verifier }),
			})
			if (
				typeof tokens.access_token !== 'string' ||
				!tokens.access_token ||
				tokens.token_type !== 'Bearer' ||
				typeof tokens.refresh_token !== 'string' ||
				!tokens.refresh_token ||
				!Number.isFinite(tokens.expires_in) ||
				tokens.expires_in <= 0
			)
				throw new AuthError('invalid_token_response')
			const profile = await authFetch('/v1/account/get_credential', { headers: { Authorization: `Bearer ${tokens.access_token}` } })
			const attributes = profile.attributes
			if (typeof attributes?.id !== 'string' || !attributes.id || attributes.id.includes('/')) throw new AuthError('invalid_profile')
			const name = [attributes.name, attributes.displayName, attributes.display_name].find((v) => typeof v === 'string' && v) || attributes.id
			const user = { email: attributes.id, name }
			const userRef = collection('user').doc(attributes.id)
			await userRef.firestore.runTransaction(async (transaction) => {
				if (!(await transaction.get(userRef)).exists) transaction.create(userRef, { id: attributes.id, name, joined: [] })
			})
			// Only the local app session persists. Upstream access/refresh tokens are discarded.
			await createSession(req, res, user)
			return res.redirect(303, safeReturnPath(pending.returnTo))
		}
		return res.status(404).json({ error: 'unknown_auth_route' })
	} catch (error) {
		const failure = error instanceof AuthError ? error : new AuthError('authentication_failed')
		// Never log exception messages, callback URLs, codes, tokens, or upstream bodies.
		console.error('Authentication failed', {
			stage: ['signin/tips', 'callback/tips', 'session', 'signout'].includes(route) ? route : 'unknown',
			code: failure.code,
			status: failure.status,
			errorId: failure.errorId,
		})
		if (route === 'session' || route === 'signout') return res.status(failure.status === 403 ? 403 : 503).json({ error: failure.code })
		const params = new URLSearchParams({ error: failure.code })
		if (failure.status) params.set('status', String(failure.status))
		if (failure.errorId) params.set('error_id', failure.errorId)
		if (failure.retryAfter) {
			const delay = /^\d+$/.test(failure.retryAfter) ? Number(failure.retryAfter) * 1000 : Date.parse(failure.retryAfter) - Date.now()
			if (Number.isFinite(delay) && delay > 0) params.set('retry_at', String(Date.now() + Math.min(delay, 86400000)))
		}
		return res.redirect(303, `/login?${params}`)
	}
}
