import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { IAction, IBoard, IComment } from '@/types'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next/types'
import { getServerSession } from 'next-auth'
import { v4 as uuid } from 'uuid'

type Data = {
	success: boolean
	error: boolean
	message?: string
	id?: string
}
type IBody = {
	id: string
	text: string
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
	const cardId = body.id
	const data = await db.collection(`${process.env.FIRESTORE_PREFIX}-comment`).doc(cardId).get()
	const json = data.data() || { data: [] }
	await db
		.collection(`${process.env.FIRESTORE_PREFIX}-comment`)
		.doc(cardId)
		.set({
			data: [
				...json.data,
				{
					text: body.text,
					owner: session.user?.email || '',
					id: uuid(),
					createdAtUnix: Math.floor(Date.now() / 1000),
				},
			],
		})
	res.status(200).json({ success: true, error: false })
}
