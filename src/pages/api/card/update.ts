import { authOptions } from '@/pages/api/auth/[...nextauth]'
import type { IAction, IBoard, ICardDetails } from '@/types'
import { historyUpdate } from '@/utils/historyUpdate'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next/types'
import { getServerSession } from 'next-auth'

type Data = {
	success: boolean
	error: boolean
	message?: string
	id?: string
}
type IBody = {
	id: string
	data: ICardDetails
	action: IAction
	checkLatest: number
	force: boolean
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
		version: body.version,
	}
	const card = await db.collection(`${process.env.FIRESTORE_PREFIX}-card`).doc(body.id).get()
	const oldData = card.data()
	if (!card.exists || !oldData) {
		res.status(404).json({ success: false, error: true, message: 'Card not found' })
		return
	}
	if (!body.force && oldData.version !== body.checkLatest) {
		res.status(409).json({ success: false, error: true, message: 'Conflict', id: 'conflict' })
		return
	}

	await db.collection(`${process.env.FIRESTORE_PREFIX}-card`).doc(body.id).update(data)

	// if (body.action === 'doCheckList') {
	// 	await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(body.boardId).update({
	// 		checkList: body.data.checkList.length || 0,
	// 		checkListDone: body.data.checkList.filter((item) => item.isDone).length || 0
	// 	})
	// }

	historyUpdate(body.action, body.id, session.user?.email || '')
	res.status(200).json({ success: true, error: false })
}
