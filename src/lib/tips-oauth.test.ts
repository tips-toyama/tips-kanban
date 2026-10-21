import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseProfile, parseTokens, refreshTipsToken, requestTokens } from './tips-oauth'

test('keeps case-sensitive account IDs and handles display names', () => {
	assert.deepEqual(parseProfile({ attributes: { id: 'UserABC', display_name: 'Alice' } }), {
		id: 'UserABC',
		accountId: 'UserABC',
		email: 'UserABC',
		name: 'Alice',
		emailVerified: false,
	})
	for (const profile of [null, {}, { attributes: { id: '' } }, { attributes: { id: 'bad/id' } }]) {
		assert.throws(() => parseProfile(profile))
	}
})

test('validates rotating token responses and preserves the provider expiry', () => {
	const tokens = { access_token: 'access', refresh_token: 'refresh', token_type: 'Bearer', expires_in: 60 }
	assert.equal(parseTokens(tokens, 1000).accessTokenExpiresAt?.getTime(), 61000)
	for (const overrides of [{ access_token: '' }, { refresh_token: '' }, { token_type: 'Basic' }, { expires_in: -1 }, { expires_in: Number.POSITIVE_INFINITY }]) {
		assert.throws(() => parseTokens({ ...tokens, ...overrides }))
	}
})

test('uses form-encoded Basic authentication and the separate refresh endpoint', async () => {
	process.env.CLIENT_ID = 'client: +'
	process.env.CLIENT_SECRET = 'secret:+&'
	process.env.API_ORIGIN = 'https://api.example.test'
	const original = globalThis.fetch
	const calls: { url: string; body: URLSearchParams }[] = []
	globalThis.fetch = async (input, init) => {
		const headers = new Headers(init?.headers)
		assert.equal(headers.get('Authorization'), `Basic ${Buffer.from('client%3A+%2B:secret%3A%2B%26').toString('base64')}`)
		assert.equal(init?.redirect, 'error')
		const body = init?.body as URLSearchParams
		assert.equal(body.get('client_id'), process.env.CLIENT_ID)
		assert.equal(body.has('client_secret'), false)
		calls.push({ url: String(input), body })
		return Response.json({ access_token: 'a', refresh_token: 'r2', token_type: 'bearer', expires_in: 60 })
	}
	try {
		await requestTokens('/v3/login/token', { grant_type: 'authorization_code', code: 'code', code_verifier: 'verifier' })
		const [first, second] = await Promise.all([refreshTipsToken('r1'), refreshTipsToken('r1')])
		assert.deepEqual(first, second)
		assert.equal(calls.length, 2)
		assert.equal(calls[1].url, 'https://api.example.test/v3/refresh')
		assert.equal(calls[1].body.get('refresh_token'), 'r1')
		globalThis.fetch = async () => new Response('', { status: 401 })
		await assert.rejects(refreshTipsToken('r2'))
	} finally {
		globalThis.fetch = original
	}
})
