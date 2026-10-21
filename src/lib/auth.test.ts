import assert from 'node:assert/strict'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { test } from 'node:test'

process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.BETTER_AUTH_SECRET = 'test-only-secret-with-at-least-32-characters-12345'
process.env.CLIENT_ID = 'client'
process.env.CLIENT_SECRET = 'secret'
process.env.API_ORIGIN = 'https://api.example.test'

test('OAuth uses state and S256 PKCE, preserves identity, rotates tokens, and signs out', async () => {
	const { createAuth } = await import('./auth')
	const { getServerSession } = await import('./auth-session')
	const users: string[] = []
	const auth = createAuth(async (profile) => {
		users.push(profile.id)
	})
	const cookies = new Map<string, string>()
	function saveCookies(headers: Headers) {
		for (const cookie of headers.getSetCookie()) {
			const pair = cookie.split(';')[0]
			const index = pair.indexOf('=')
			cookies.set(pair.slice(0, index), pair.slice(index + 1))
		}
	}
	function headers() {
		return new Headers({ origin: 'http://localhost:3000', cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') })
	}
	const originalFetch = globalThis.fetch
	let exchanges = 0
	let refreshes = 0
	let refreshFails = false
	globalThis.fetch = async (input, init) => {
		const url = String(input)
		if (url.endsWith('/v3/login/token')) {
			exchanges++
			const body = init?.body as URLSearchParams
			assert.ok(body.get('code_verifier'))
			assert.equal(body.get('redirect_uri'), 'http://localhost:3000/api/auth/callback/tips')
			return Response.json({ access_token: 'initial-access', refresh_token: 'initial-refresh', token_type: 'bearer', expires_in: 1 })
		}
		if (url.endsWith('/v1/account/get_credential')) {
			assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer initial-access')
			return Response.json({ attributes: { id: 'UserABC', name: 'Alice' } })
		}
		if (url.endsWith('/v3/refresh')) {
			refreshes++
			if (refreshFails) {
				assert.equal((init?.body as URLSearchParams).get('refresh_token'), 'rotated-refresh')
				return new Response('', { status: 401 })
			}
			assert.equal((init?.body as URLSearchParams).get('refresh_token'), 'initial-refresh')
			return Response.json({ access_token: 'rotated-access', refresh_token: 'rotated-refresh', token_type: 'bearer', expires_in: 1 })
		}
		throw new Error(`Unexpected fetch: ${url}`)
	}
	try {
		const start = await auth.handler(
			new Request('http://localhost:3000/api/auth/sign-in/social', {
				method: 'POST',
				headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'tips', callbackURL: '/', errorCallbackURL: '/login' }),
			}),
		)
		assert.equal(start.status, 200)
		saveCookies(start.headers)
		const authorize = new URL((await start.json()).url)
		assert.equal(authorize.origin, 'https://api.example.test')
		assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256')
		assert.ok(authorize.searchParams.get('code_challenge'))
		const state = authorize.searchParams.get('state')
		assert.ok(state)
		const invalid = await auth.handler(new Request('http://localhost:3000/api/auth/callback/tips?code=code&state=invalid', { headers: headers() }))
		assert.equal(invalid.status, 302)
		assert.equal(exchanges, 0)
		const callbackURL = `http://localhost:3000/api/auth/callback/tips?code=code&state=${encodeURIComponent(state)}`
		const callback = await auth.handler(new Request(callbackURL, { headers: headers() }))
		assert.equal(callback.status, 302)
		assert.equal(callback.headers.get('location'), '/')
		saveCookies(callback.headers)
		assert.deepEqual(users, ['UserABC'])
		const session = await auth.api.getSession({ headers: headers() })
		assert.equal(session?.user.accountId, 'UserABC')
		assert.equal(session?.user.name, 'Alice')
		assert.equal(JSON.stringify(session).includes('initial-access'), false)
		assert.equal(JSON.stringify(session).includes('initial-refresh'), false)
		const replay = await auth.handler(new Request(callbackURL, { headers: headers() }))
		assert.equal(replay.status, 302)
		assert.equal(exchanges, 1)
		const forbiddenUpdate = await auth.handler(
			new Request('http://localhost:3000/api/auth/update-user', {
				method: 'POST',
				headers: new Headers({ ...Object.fromEntries(headers()), 'Content-Type': 'application/json' }),
				body: JSON.stringify({ accountId: 'SomeoneElse' }),
			}),
		)
		assert.equal(forbiddenUpdate.status, 404)
		for (const path of ['get-access-token', 'refresh-token', 'account-info']) {
			const response = await auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, { method: 'POST', headers: headers() }))
			assert.equal(response.status, 404)
		}
		const req = new IncomingMessage(new Socket())
		req.headers = Object.fromEntries(headers())
		const res = new ServerResponse(req)
		res.setHeader('Set-Cookie', 'existing=preserved')
		assert.equal((await getServerSession(req, res, auth))?.user.accountId, 'UserABC')
		assert.equal(refreshes, 1)
		const forwarded = res.getHeader('Set-Cookie') as string[]
		assert.equal(forwarded[0], 'existing=preserved')
		const updatedHeaders = new Headers()
		for (const cookie of forwarded.slice(1)) updatedHeaders.append('Set-Cookie', cookie)
		saveCookies(updatedHeaders)
		refreshFails = true
		req.headers = Object.fromEntries(headers())
		const failedRes = new ServerResponse(req)
		assert.equal(await getServerSession(req, failedRes, auth), null)
		const cleared = new Headers()
		for (const cookie of failedRes.getHeader('Set-Cookie') as string[]) cleared.append('Set-Cookie', cookie)
		saveCookies(cleared)
		assert.equal(await auth.api.getSession({ headers: headers() }), null)
		assert.equal(await getServerSession(req, new ServerResponse(req), auth), null)
	} finally {
		globalThis.fetch = originalFetch
	}
})
