import type { IAction } from '@/types'
import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { v4 as uuid } from 'uuid'

export const historyUpdate = async (action: IAction, cardId: string, userId: string) => {
	const db = getFirestore()
	const data = await db.collection(`${process.env.FIRESTORE_PREFIX}-history`).doc(cardId).get()
	const json = data.data() || { data: [] }
	await db
		.collection(`${process.env.FIRESTORE_PREFIX}-history`)
		.doc(cardId)
		.set({
			data: [
				...json.data,
				{
					action,
					owner: userId,
					id: uuid(),
					createdAtUnix: Math.floor(Date.now() / 1000),
				},
			],
		})
}
