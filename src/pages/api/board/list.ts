import { authOptions } from '@/pages/api/auth/[...nextauth]'
import type { IBoardMeta, IBoardMetaState } from '@/types'
import { userSubscribedList } from '@/utils/userUpdate'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

type Data = {
	error: true
	message?: string
}
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data | IBoardMeta[]>) {
	const session = await getServerSession(req, res, authOptions)
	if (!session) {
		res.status(401).json({ error: true, message: 'You must be logged in' })
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
	const snapshot = await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).get()
	const boards: IBoardMeta[] = []
	const joined = await userSubscribedList(session.user?.email || '')
	snapshot.forEach((doc) => {
		const data = doc.data() as IBoardMetaState
		if (data.visibility === 'public' || joined.includes(doc.id)) boards.push({ ...data, id: doc.id } as IBoardMeta)
	})
	res.status(200).json(boards)
}
