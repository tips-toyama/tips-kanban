/** Browser-only reference. Read README.md before integration. One instance per SPA. */
export interface PasskeyBrowser {
	register(optionsJSON: unknown): Promise<unknown>
	authenticate(optionsJSON: unknown): Promise<unknown>
}
type Authorization = {
	response_type: 'code'
	client_id: string
	redirect_uri: string
	code_challenge: string
	code_challenge_method: 'S256'
	state: string
}
type Tokens = { access_token: string; refresh_token: string; token_type: 'Bearer'; expires_in: number }
type Pending = { state: string; verifier: string; createdAt: number }
type Ceremony = { requestId: string; publicKey: unknown }
export class AuthError extends Error {
	constructor(
		public code: string,
		public status = 0,
		public retryAfter: string | null = null,
		public errorId?: string
	) {
		super(code)
		this.name = 'AuthError'
	}
}
const base64url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '')
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)))
const one = (params: URLSearchParams, name: string) => {
	const values = params.getAll(name)
	if (values.length !== 1 || !values[0]) throw new AuthError('invalid_callback_or_request')
	return values[0]
}

export function createAuthClient(
	config: {
		apiOrigin: string
		clientId: string
		redirectUri: string
	},
	passkeys: PasskeyBrowser
) {
	// Baseline: login UI, callback, and enrollment run on the SAME origin.
	const api = new URL(config.apiOrigin)
	const callback = new URL(config.redirectUri)
	for (const url of [api, callback]) {
		if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost'))) throw new Error('Unsafe auth URL')
	}
	if (api.href !== `${api.origin}/` || callback.origin !== location.origin || callback.search || callback.hash || callback.href !== config.redirectUri) throw new Error('Invalid auth configuration')
	const pendingKey = `oauth-v3:${config.clientId}:${config.redirectUri}`
	let session: (Tokens & { expiresAt: number }) | undefined
	let refreshJob: Promise<string> | undefined
	let callbackJob: Promise<void> | undefined
	let generation = 0

	async function post<T>(path: string, body: object | URLSearchParams, bearer?: string): Promise<T> {
		const form = body instanceof URLSearchParams
		const headers: Record<string, string> = { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }
		if (bearer) headers.Authorization = `Bearer ${bearer}`
		const response = await fetch(new URL(path, api), {
			method: 'POST',
			headers,
			body: form ? body.toString() : JSON.stringify(body),
			credentials: 'omit',
			cache: 'no-store',
			redirect: 'error',
			referrerPolicy: 'no-referrer'
		})
		const data = await response.json()
		if (!response.ok)
			throw new AuthError(
				typeof data?.error === 'string' ? data.error : 'request_failed',
				response.status,
				response.headers.get('Retry-After'),
				typeof data?.error_id === 'string' ? data.error_id : undefined
			)
		return data as T
	}
	function saveTokens(tokens: Tokens, startedAt: number, expectedGeneration: number) {
		if (generation !== expectedGeneration) throw new AuthError('session_changed')
		if (
			!tokens ||
			typeof tokens.access_token !== 'string' ||
			!tokens.access_token ||
			typeof tokens.refresh_token !== 'string' ||
			!tokens.refresh_token ||
			tokens.token_type !== 'Bearer' ||
			!Number.isFinite(tokens.expires_in) ||
			tokens.expires_in <= 0
		)
			throw new AuthError('invalid_token_response')
		session = { ...tokens, expiresAt: startedAt + tokens.expires_in * 1000 }
	}
	function clearSession() {
		generation++
		session = undefined
		sessionStorage.removeItem(pendingKey)
		// In-flight requests may finish, but generation prevents restoring a cleared session.
	}
	async function beginAuthorization() {
		clearSession()
		const verifier = random()
		const state = random()
		const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
		sessionStorage.setItem(pendingKey, JSON.stringify({ state, verifier, createdAt: Date.now() } satisfies Pending))
		const url = new URL('/v3/login/authorize', api)
		url.search = new URLSearchParams({
			response_type: 'code',
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			code_challenge: challenge,
			code_challenge_method: 'S256',
			state
		}).toString()
		location.assign(url.href) // Full navigation; authorization endpoint redirects to LOGIN_SERVER /login.
	}
	function readLoginRequest(): Authorization {
		const params = new URL(location.href).searchParams
		const names = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state']
		if ([...params.keys()].some((key) => !names.includes(key))) throw new AuthError('invalid_request')
		const values = Object.fromEntries(names.map((key) => [key, one(params, key)]))
		if (
			values.response_type !== 'code' ||
			values.client_id !== config.clientId ||
			values.redirect_uri !== config.redirectUri ||
			values.code_challenge_method !== 'S256' ||
			!/^[A-Za-z0-9_-]{43}$/.test(values.code_challenge) ||
			values.state.length > 1024
		)
			throw new AuthError('invalid_request')
		return values as Authorization
	}
	function followRedirect(result: { redirect_uri: string }, auth: Authorization) {
		const url = new URL(result.redirect_uri)
		if (
			url.origin !== callback.origin ||
			url.pathname !== callback.pathname ||
			url.username ||
			url.password ||
			url.hash ||
			[...url.searchParams.keys()].some((key) => key !== 'code' && key !== 'state') ||
			one(url.searchParams, 'state') !== auth.state ||
			!/^[A-Za-z0-9_-]{43}$/.test(one(url.searchParams, 'code'))
		)
			throw new AuthError('invalid_redirect')
		location.replace(url.href)
	}
	async function passwordLogin(username: string, password: string) {
		const auth = readLoginRequest()
		followRedirect(await post<{ redirect_uri: string }>('/v3/login', { ...auth, username, password }), auth)
	}
	async function preparePasskeyLogin() {
		const auth = readLoginRequest()
		const options = await post<Ceremony>('/v1/authn/login', auth)
		let used = false
		// Invoke this function directly from a fresh button click (preserves user activation).
		return async function finishPasskeyLogin() {
			if (used) throw new AuthError('ceremony_already_used')
			used = true
			const credential = await passkeys.authenticate(options.publicKey)
			followRedirect(
				await post<{ redirect_uri: string }>('/v1/authn/verify', {
					requestId: options.requestId,
					credential
				}),
				auth
			)
		}
	}
	function completeCallback(): Promise<void> {
		// React StrictMode/router double invocation must reuse the SAME promise, even after rejection.
		// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
		return (callbackJob ??= (async () => {
			const url = new URL(location.href)
			if (url.origin !== callback.origin || url.pathname !== callback.pathname) throw new AuthError('invalid_callback')
			const raw = sessionStorage.getItem(pendingKey)
			sessionStorage.removeItem(pendingKey)
			history.replaceState(null, '', callback.pathname) // Before analytics, images, profile calls, etc.
			if (!raw || url.hash || [...url.searchParams.keys()].some((key) => key !== 'code' && key !== 'state')) throw new AuthError('invalid_callback')
			const pending: Pending = JSON.parse(raw)
			if (
				!pending ||
				!Number.isFinite(pending.createdAt) ||
				Date.now() - pending.createdAt > 10 * 60_000 ||
				pending.createdAt > Date.now() ||
				!/^[A-Za-z0-9_-]{43}$/.test(pending.verifier) ||
				one(url.searchParams, 'state') !== pending.state
			)
				throw new AuthError('invalid_state')
			const code = one(url.searchParams, 'code')
			if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new AuthError('invalid_code')
			const startedAt = Date.now()
			const currentGeneration = generation
			const tokens = await post<Tokens>(
				'/v3/login/token',
				new URLSearchParams({
					grant_type: 'authorization_code',
					client_id: config.clientId,
					redirect_uri: config.redirectUri,
					code,
					code_verifier: pending.verifier
				})
			)
			saveTokens(tokens, startedAt, currentGeneration)
		})())
	}
	async function accessToken(): Promise<string> {
		if (!session) throw new AuthError('login_required')
		if (refreshJob) return refreshJob
		if (session.expiresAt > Date.now() + 30_000) return session.access_token
		const token = session.refresh_token // Opaque Cognito value, unchanged.
		const currentGeneration = generation
		refreshJob = (async () => {
			try {
				const startedAt = Date.now()
				const tokens = await post<Tokens>(
					'/v3/refresh',
					new URLSearchParams({
						grant_type: 'refresh_token',
						client_id: config.clientId,
						refresh_token: token
					})
				)
				saveTokens(tokens, startedAt, currentGeneration)
				return tokens.access_token
			} catch (error) {
				// A lost response may mean rotation succeeded. NEVER retry the old token automatically.
				if (generation === currentGeneration) clearSession()
				throw error
			} finally {
				refreshJob = undefined
			}
		})()
		return refreshJob
	}
	async function prepareRegistration() {
		const bearer = await accessToken()
		const currentGeneration = generation
		const options = await post<Ceremony>('/v1/authn/create', {}, bearer)
		let used = false
		return async function finishRegistration() {
			if (used || generation !== currentGeneration) throw new AuthError('ceremony_already_used')
			used = true
			const credential = await passkeys.register(options.publicKey)
			if (generation !== currentGeneration) throw new AuthError('session_changed')
			// Capture the SAME token as create, even if other requests have refreshed in the meantime.
			const result = await post<{ success: boolean }>(
				'/v1/authn/register',
				{
					requestId: options.requestId,
					credential
				},
				bearer
			)
			if (result.success !== true) throw new AuthError('registration_failed')
		}
	}
	return { beginAuthorization, readLoginRequest, passwordLogin, preparePasskeyLogin, completeCallback, accessToken, prepareRegistration, clearSession }
}
