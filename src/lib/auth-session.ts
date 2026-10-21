import type { IncomingMessage, ServerResponse } from 'node:http'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './auth'

function forwardCookies(headers: Headers, res: ServerResponse) {
	const cookies = headers.getSetCookie()
	if (!cookies.length) return
	const existing = res.getHeader('Set-Cookie')
	res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : existing ? [String(existing)] : []), ...cookies])
}

export async function getServerSession(req: IncomingMessage, res: ServerResponse, authInstance = auth) {
	const headers = fromNodeHeaders(req.headers)
	const result = await authInstance.api.getSession({ headers, returnHeaders: true })
	forwardCookies(result.headers, res)
	if (!result.response) return null
	try {
		const tokens = await authInstance.api.getAccessToken({ headers, body: { useAccountCookie: true }, returnHeaders: true })
		forwardCookies(tokens.headers, res)
		if (!tokens.response.accessToken) throw new Error('Login required')
		return result.response
	} catch {
		const signedOut = await authInstance.api.signOut({ headers, returnHeaders: true })
		forwardCookies(signedOut.headers, res)
		return null
	}
}
