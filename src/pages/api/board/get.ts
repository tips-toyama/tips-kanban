import { authOptions } from '@/pages/api/auth/[...nextauth]'
import type { IBoard, IBoardMeta } from '@/types'
import { userIsSubscribed, userJoin } from '@/utils/userUpdate'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next/types'
import { getServerSession } from 'next-auth'

type Data = {
	error: true
	message?: string
}
type IReturn  = {
	data: IBoard
} & IBoardMeta

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data | IReturn>) {
	const session = await getServerSession(req, res, authOptions)
	if (!session) {
		res.status(401).json({ error: true, message: 'You must be logged in' })
		return
	}
	const { id } = req.query
	if (typeof id !== 'string') {
		res.status(400).json({ error: true, message: 'Invalid request' })
		return
	}
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
	const board = await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(id).get()
	if (!board.exists) {
		res.status(404).json({ error: true, message: 'Board not found' })
		return
	}
	const boardData = board.data() as IReturn
	const vis = boardData.visibility
	const isSubscribed = await userIsSubscribed(session.user?.email || '', id)
	if (vis === 'private') {
		if (!isSubscribed) {
			res.status(403).json({ error: true, message: 'You are not subscribed to this board' })
			return
		}
	} else if (vis === 'limited') {
		if (!isSubscribed) userJoin(session.user?.email || '', id)
	}
	res.status(200).json(boardData)
}
