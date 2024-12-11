import { authOptions } from '@/pages/api/auth/[...nextauth]'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { v4 as uuid } from 'uuid'

type Data = {
	success: boolean
	error: boolean
	message?: string
	id?: string
}
type IBody = {
	color: string
	title: string
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

	const newBoard = {
		color: body.color,
		title: body.title,
		order: [],
		data: {},
		visibility: 'limited',
		version: Math.floor(new Date().getTime() / 1000),
	}
	await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(uuid()).set(newBoard)
	res.status(200).json({ success: true, error: false })
}
