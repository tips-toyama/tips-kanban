import { IAction, IBoard, ICardDetails } from '@/types'
import admin from 'firebase-admin'
import { getDownloadURL, getStorage } from 'firebase-admin/storage'
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
	url: string
}
type IBody = {
	name: string
	path: string
	data: string
}
export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
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
	const storage = getStorage()
	const file = storage.bucket(process.env.FIRESTORAGE_BUCKET).file(`${process.env.FIRESTORE_PREFIX}/upload/${body.path}`)
	await file.save(Buffer.from(body.data, 'base64'))
	await file.makePublic()
	const url = file.publicUrl()
	console.log(url)
	res.status(200).json({ url })
}
export const config = {
	api: {
		bodyParser: {
			sizeLimit: '20mb', // Set desired value here
		},
	},
}
