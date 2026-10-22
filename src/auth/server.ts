import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import type { Session } from './types'

export const randomToken = () => randomBytes(32).toString('base64url')
export const digest = (value: string) => createHash('sha256').update(value).digest('base64url')
const sessionSeconds = 8 * 60 * 60
export class AuthError extends Error {
	constructor(
		public code: string,
		public status = 0,
		public errorId?: string,
		public retryAfter?: string,
	) {
		super(code)
	}
}
export function config() {
	const origin = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || '')
	const api = new URL(process.env.API_ORIGIN || '')
	for (const url of [origin, api]) {
		if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')))
			throw new AuthError('configuration')
	}
	if (!process.env.CLIENT_ID) throw new AuthError('configuration')
	return { origin: origin.origin, api: api.origin, clientId: process.env.CLIENT_ID, callback: `${origin.origin}/api/auth/callback/tips`, secure: origin.protocol === 'https:' }
}
export function safeReturnPath(value: unknown) {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || [...value].some((char) => char === '\\' || char.charCodeAt(0) <= 32)) return '/'
	const url = new URL(value, 'https://local.invalid')
	return url.origin === 'https://local.invalid' && (url.pathname === '/' || /^\/board\/[^/]+$/.test(url.pathname)) ? `${url.pathname}${url.search}` : '/'
}
export function database() {
	if (!admin.apps.length)
		admin.initializeApp({
			credential: admin.credential.cert({
				projectId: process.env.FIREBASE_PROJECT_ID,
				clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
				privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
			}),
		})
	return getFirestore()
}
export const collection = (name: string) => database().collection(`${process.env.FIRESTORE_PREFIX}-${name}`)
export function cookieName(kind: string) {
	return `${config().secure ? '__Host-' : ''}tips-${kind}`
}
export function readCookie(req: IncomingMessage, kind: string) {
	const name = cookieName(kind)
	const values = (req.headers.cookie || '')
		.split(';')
		.map((v) => v.trim())
		.filter((v) => v.startsWith(`${name}=`))
	const value = values.length === 1 ? values[0].slice(name.length + 1) : ''
	return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined
}
export function setCookie(res: ServerResponse, kind: string, value: string, maxAge: number) {
	const previous = res.getHeader('Set-Cookie')
	const cookies = previous ? (Array.isArray(previous) ? previous.map(String) : [String(previous)]) : []
	res.setHeader('Set-Cookie', [...cookies, `${cookieName(kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config().secure ? '; Secure' : ''}`])
}
export async function getServerSession(req: IncomingMessage, res: ServerResponse): Promise<Session | null> {
	res.setHeader('Cache-Control', 'no-store')
	res.setHeader('Vary', 'Cookie')
	const id = readCookie(req, 'session')
	if (!id) return null
	const doc = await collection('auth-session').doc(digest(id)).get()
	const session = doc.data()
	if (!session || typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now()) {
		setCookie(res, 'session', '', 0)
		return null
	}
	return { user: session.user, expires: new Date(session.expiresAt).toISOString() }
}
export async function createSession(req: IncomingMessage, res: ServerResponse, user: Session['user']) {
	const old = readCookie(req, 'session')
	if (old) await collection('auth-session').doc(digest(old)).delete()
	const id = randomToken()
	const expiresAt = Date.now() + sessionSeconds * 1000
	await collection('auth-session')
		.doc(digest(id))
		.create({ user, expiresAt, cleanupAt: new Date(expiresAt) })
	setCookie(res, 'session', id, sessionSeconds)
}
export function requireSameOrigin(req: IncomingMessage) {
	if (req.headers.origin !== config().origin) throw new AuthError('invalid_origin', 403)
}
export async function authFetch(path: string, init: RequestInit) {
	let response: Response
	try {
		response = await fetch(`${config().api}${path}`, { ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) })
	} catch {
		throw new AuthError('network_error')
	}
	const data = await response.json().catch(() => null)
	if (!response.ok)
		throw new AuthError(
			['invalid_request', 'invalid_client', 'invalid_grant', 'unauthorized_client', 'unsupported_grant_type', 'access_denied', 'server_error', 'temporarily_unavailable'].includes(data?.error)
				? data.error
				: 'upstream_error',
			response.status,
			typeof data?.error_id === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(data.error_id) ? data.error_id : undefined,
			response.headers.get('Retry-After') || undefined,
		)
	if (!data) throw new AuthError('invalid_response', response.status)
	return data
}
export function tokenHeaders() {
	const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
	// Optional confidential client support; secrets never enter the browser.
	if (process.env.CLIENT_SECRET) {
		const encode = (v: string) => new URLSearchParams({ v }).toString().slice(2)
		headers.Authorization = `Basic ${Buffer.from(`${encode(config().clientId)}:${encode(process.env.CLIENT_SECRET)}`).toString('base64')}`
	}
	return headers
}
