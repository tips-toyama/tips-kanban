import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { IAction, IBoard } from '@/types'
import { historyUpdate } from '@/utils/historyUpdate'
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
	await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(body.id).update(data)

	res.status(200).json({ success: true, error: false })
}
