import { authOptions } from '@/pages/api/auth/[...nextauth]'
import type { IAction, IBoard } from '@/types'
import { historyUpdate } from '@/utils/historyUpdate'
import { publicOrUserIsSubscribed } from '@/utils/userUpdate'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

type Data = {
	success: boolean
	error: boolean
	message?: string
}
type IBody = {
	id: string
	cardId: string
	data: IBoard
	ordered?: string[]
	action: IAction
	version: number
}
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
	const session = await getServerSession(req, res, authOptions)
	if (!session) {
		res.status(401).json({ success: false, error: true, message: 'You must be logged in' })
		return
	}
	const body: IBody = req.body
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
	const data = {
		data: body.data,
		order: body.ordered,
		version: body.version,
	}
	if (!data.order) delete data.order
    if (!publicOrUserIsSubscribed(session.user?.email || '', body.id)) {
        res.status(401).json({ success: false, error: true, message: 'You are not in your board' })
		return
    }
	await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(body.id).update(data)
	if (body.cardId) historyUpdate(body.action, body.cardId, session.user?.email || '')
	res.status(200).json({ success: true, error: false })
}
