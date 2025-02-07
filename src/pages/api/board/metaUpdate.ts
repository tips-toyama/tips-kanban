import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { userJoin, userRemove, userSubscribedList } from '@/utils/userUpdate'
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
	title: string
	color: string
	visibility: string
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
		title: body.title,
		color: body.color,
		version: body.version,
		visibility: body.visibility
	}

	const board = await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(body.id).get()
	if (!board.exists) {
		res.status(404).json({ success: false, error: true, message: 'Board not found' })
		return
	}
	const boardData = board.data()
	if (boardData?.visibility === 'public' && data.visibility === 'limited') {
		// become limited, join this user to this board
		await userJoin(session.user?.email || '', body.id)
	}
	if (boardData?.visibility === 'limited') {
		const joined = await userSubscribedList(session.user?.email || '')
		if (!(joined as string[]).includes(body.id)) {
			res.status(401).json({ success: false, error: true, message: 'You are not in your board' })
			return
		}
		if (data.visibility === 'public') {
			// become public, remove this user from this board
			await userRemove(session.user?.email || '', body.id)
		}
	}
	await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(body.id).update(data)

	res.status(200).json({ success: true, error: false })
}
