import { auth } from '@/lib/auth'
import { getServerSession } from '@/lib/auth-session'
import { toNodeHandler } from 'better-auth/node'
import type { NextApiRequest, NextApiResponse } from 'next'

const handler = toNodeHandler(auth.handler)
export const config = { api: { bodyParser: false } }

export default async function authHandler(req: NextApiRequest, res: NextApiResponse) {
	res.setHeader('Cache-Control', 'no-store')
	res.setHeader('Pragma', 'no-cache')
	const path = Array.isArray(req.query.all) ? req.query.all.join('/') : req.query.all
	if (path === 'get-session' && (req.method === 'GET' || req.method === 'POST')) {
		res.status(200).json(await getServerSession(req, res))
		return
	}
	return handler(req, res)
}
