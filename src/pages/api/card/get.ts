import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { IBoard, type ICardDetails } from '@/types'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

type Data = {
	error: true
	message?: string
}
type IReturn = {
	data: ICardDetails
	version: number
}

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
	const card = await db.collection(`${process.env.FIRESTORE_PREFIX}-card`).doc(id).get()
	if (!card.exists) {
		res.status(404).json({ error: true, message: 'Card not found' })
		return
	}
	res.status(200).json(card.data() as IReturn)
}
