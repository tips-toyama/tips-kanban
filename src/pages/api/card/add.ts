import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { IAction, IBoard, type ICardDetails } from '@/types'
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
	version: number
	copyFrom?: string
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
	const from = body.copyFrom
	if (from) {
		const card = await db.collection(`${process.env.FIRESTORE_PREFIX}-card`).doc(from).get()
		const oldCardData = card.data()?.data as ICardDetails
		const newCard: ICardDetails = {
			content: oldCardData.content || '',
			checkList: oldCardData.checkList || [],
			attachments: oldCardData.attachments || [],
		}
		const data = {
			data: newCard,
			version: body.version,
		}
		await db.collection(`${process.env.FIRESTORE_PREFIX}-card`).doc(body.id).set(data)
	} else {
		const newCard: ICardDetails = {
			content: '',
			checkList: [],
			attachments: [],
		}
		const data = {
			data: newCard,
			version: body.version,
		}
		await db.collection(`${process.env.FIRESTORE_PREFIX}-card`).doc(body.id).set(data)
	}

	await db.collection(`${process.env.FIRESTORE_PREFIX}-history`).doc(body.id).set({ data: [] })
	await db.collection(`${process.env.FIRESTORE_PREFIX}-comment`).doc(body.id).set({ data: [] })
	historyUpdate('add', body.id, session.user?.email || '')
	res.status(200).json({ success: true, error: false })
}
