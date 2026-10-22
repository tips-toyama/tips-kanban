import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '../pages/api/auth/[...nextauth]/index'
import { authFetch, config, digest, getServerSession, randomToken, safeReturnPath, tokenHeaders } from './server'

const records = new Map<string, Record<string, any>>()
const mockDb: any = {
	collection: (name: string) => ({
		doc: (id: string) => {
			const key = `${name}/${id}`
			return {
				key,
				firestore: mockDb,
				get: async () => ({ exists: records.has(key), data: () => records.get(key) }),
				create: async (data: any) => {
					records.set(key, data)
				},
				delete: async () => {
					records.delete(key)
				},
			}
		},
	}),
	runTransaction: async (callback: any) => {
		const writes: (() => void)[] = []
		const result = await callback({
			get: (ref: any) => ref.get(),
			delete: (ref: any) => writes.push(() => records.delete(ref.key)),
			create: (ref: any, data: any) => writes.push(() => records.set(ref.key, data)),
		})
		for (const write of writes) write()
		return result
	},
}
jest.mock('firebase-admin', () => ({ __esModule: true, default: { apps: [{}] } }))
jest.mock('firebase-admin/firestore', () => ({ getFirestore: () => mockDb }))
const mockFetch = jest.fn()
let errorLog: jest.SpyInstance
function request(route: string, query: object = {}, cookie = '', method = 'GET', origin?: string) {
	return { method, query: { nextauth: route.split('/'), ...query }, headers: { cookie, origin } } as unknown as NextApiRequest
}
function response() {
	const headers = new Map<string, any>()
	const res: any = { headers, setHeader: (k: string, v: any) => headers.set(k, v), getHeader: (k: string) => headers.get(k) }
	res.json = jest.fn().mockReturnValue(res)
	res.status = jest.fn().mockReturnValue(res)
	res.redirect = jest.fn().mockReturnValue(res)
	return res as NextApiResponse & { headers: Map<string, any> }
}
async function begin() {
	const res = response()
	await handler(request('signin/tips'), res)
	const url = new URL((res.redirect as jest.Mock).mock.calls[0][1])
	const cookie = res.headers.get('Set-Cookie')[0].split(';')[0]
	return { url, cookie }
}
function upstream() {
	mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'secret-access', refresh_token: '+/opaque=', token_type: 'Bearer', expires_in: 3600 })))
	mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ attributes: { id: 'account-1', display_name: 'Alice' } })))
}
beforeEach(() => {
	records.clear()
	process.env.AUTH_URL = 'https://kanban.example.com'
	process.env.API_ORIGIN = 'https://auth.example.com'
	process.env.CLIENT_ID = 'kanban'
	process.env.FIRESTORE_PREFIX = 'test'
	delete process.env.CLIENT_SECRET
	mockFetch.mockReset()
	global.fetch = mockFetch
	errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorLog.mockRestore())

test('authorization sends exactly the six supported parameters and S256, with HttpOnly cookie', async () => {
	const { url, cookie } = await begin()
	expect([...url.searchParams.keys()].sort()).toEqual(['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state'].sort())
	const pending = records.get(`test-auth-pending/${digest(cookie.split('=')[1])}`)
	expect(url.searchParams.get('code_challenge')).toBe(digest(pending?.verifier))
	expect(url.searchParams.get('redirect_uri')).toBe(config().callback)
	expect(url.href).not.toContain(pending?.verifier)
})
test('callback keeps account IDs and memberships and persists only local session data', async () => {
	records.set('test-user/account-1', { id: 'account-1', joined: ['board-1'] })
	const { url, cookie } = await begin()
	upstream()
	const res = response()
	await handler(request('callback/tips', { state: url.searchParams.get('state'), code: randomToken() }, cookie), res)
	expect(res.redirect).toHaveBeenCalledWith(303, '/')
	expect(records.get('test-user/account-1')?.joined).toEqual(['board-1'])
	const cookies: string[] = res.headers.get('Set-Cookie')
	const sessionCookie = cookies.find((value) => value.startsWith('__Host-tips-session=')) as string
	expect(sessionCookie).toContain('HttpOnly; SameSite=Lax; Max-Age=28800; Secure')
	const session = await getServerSession(request('session', {}, sessionCookie.split(';')[0]), response())
	expect(session?.user).toEqual({ email: 'account-1', name: 'Alice' })
	expect(JSON.stringify([...records.values()])).not.toContain('secret-access')
	expect(JSON.stringify([...records.values()])).not.toContain('opaque')
	const form = mockFetch.mock.calls[0][1].body as URLSearchParams
	expect(form.get('grant_type')).toBe('authorization_code')
	expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined()
})
test.each(['missing', 'mismatch', 'duplicate', 'expired'])('rejects %s state without exchanging a code', async (kind) => {
	const { url, cookie } = await begin()
	if (kind === 'expired') for (const data of records.values()) data.createdAt -= 600001
	const state = url.searchParams.get('state')
	const res = response()
	await handler(request('callback/tips', { code: randomToken(), state: kind === 'missing' ? undefined : kind === 'mismatch' ? 'wrong' : kind === 'duplicate' ? [state, state] : state }, cookie), res)
	expect(mockFetch).not.toHaveBeenCalled()
	expect(res.redirect).toHaveBeenCalledWith(303, '/login?error=invalid_state')
})
test('callback replay never re-exchanges a consumed code', async () => {
	const { url, cookie } = await begin()
	upstream()
	const req = request('callback/tips', { state: url.searchParams.get('state'), code: randomToken() }, cookie)
	await handler(req, response())
	const res = response()
	await handler(req, res)
	expect(mockFetch).toHaveBeenCalledTimes(2)
	expect(res.redirect).toHaveBeenCalledWith(303, '/login?error=invalid_state')
})
test('failed exchange is never retried and preserves safe status and error ID', async () => {
	const { url, cookie } = await begin()
	mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'invalid_grant', error_id: 'OAUTH_123', secret: 'never-display' }), { status: 400 }))
	const req = request('callback/tips', { state: url.searchParams.get('state'), code: randomToken() }, cookie)
	const res = response()
	await handler(req, res)
	expect(res.redirect).toHaveBeenCalledWith(303, '/login?error=invalid_grant&status=400&error_id=OAUTH_123')
	await handler(req, response())
	expect(mockFetch).toHaveBeenCalledTimes(1)
	expect(JSON.stringify(errorLog.mock.calls)).not.toContain('never-display')
})
test('non-JSON upstream errors and network failures are structured', async () => {
	mockFetch.mockResolvedValueOnce(new Response('<html>failure</html>', { status: 502 }))
	await expect(authFetch('/v3/login/token', {})).rejects.toMatchObject({ code: 'upstream_error', status: 502 })
	mockFetch.mockRejectedValueOnce(new Error('secret URL'))
	await expect(authFetch('/v3/login/token', {})).rejects.toMatchObject({ code: 'network_error' })
})
test('logout requires same-origin POST and revokes the session', async () => {
	const id = randomToken()
	records.set(`test-auth-session/${digest(id)}`, { user: { email: 'id', name: 'User' }, expiresAt: Date.now() + 10000 })
	const cookie = `__Host-tips-session=${id}`
	const rejected = response()
	await handler(request('signout', {}, cookie, 'POST', 'https://evil.example'), rejected)
	expect(rejected.status).toHaveBeenCalledWith(403)
	expect(records.size).toBe(1)
	await handler(request('signout', {}, cookie, 'POST', config().origin), response())
	expect(records.size).toBe(0)
	expect(await getServerSession(request('session', {}, cookie), response())).toBeNull()
})
test('expired sessions fail even before TTL cleanup', async () => {
	const id = randomToken()
	records.set(`test-auth-session/${digest(id)}`, { user: { email: 'id' }, expiresAt: Date.now() - 1 })
	expect(await getServerSession(request('session', {}, `__Host-tips-session=${id}`), response())).toBeNull()
})
test('confidential client credentials are form-escaped before Basic encoding', () => {
	process.env.CLIENT_ID = 'id+:'
	process.env.CLIENT_SECRET = 'secret+/='
	expect(Buffer.from(tokenHeaders().Authorization.slice(6), 'base64').toString()).toBe('id%2B%3A:secret%2B%2F%3D')
})
test('configuration rejects insecure and path-bearing origins', () => {
	process.env.AUTH_URL = 'http://kanban.example.com'
	expect(config).toThrow()
	process.env.AUTH_URL = 'https://kanban.example.com/path'
	expect(config).toThrow()
})

test('return paths reject external, protocol-relative, backslash, and login-loop destinations', () => {
	for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/login', '/api/auth/signin']) expect(safeReturnPath(path)).toBe('/')
	expect(safeReturnPath('/board/board-1?view=all')).toBe('/board/board-1?view=all')
})
test('rate limit response carries a bounded retry deadline', async () => {
	const { url, cookie } = await begin()
	mockFetch.mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '60' } }))
	const res = response()
	await handler(request('callback/tips', { state: url.searchParams.get('state'), code: randomToken() }, cookie), res)
	const target = new URL((res.redirect as jest.Mock).mock.calls[0][1], config().origin)
	expect(target.searchParams.get('status')).toBe('429')
	expect(Number(target.searchParams.get('retry_at'))).toBeGreaterThan(Date.now() + 59000)
})
