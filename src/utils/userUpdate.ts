import { getFirestore } from 'firebase-admin/firestore'
import admin from 'firebase-admin'

export const userJoin = async (userId: string, boardId: string) => {
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
	const data = await db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(userId).get()
	const json = data.data() || { joined: [] }
	await db
		.collection(`${process.env.FIRESTORE_PREFIX}-user`)
		.doc(userId)
		.update({
			joined: [
				...json.joined,
				boardId,
			],
		})
}
export const userRemove = async (userId: string, boardId: string) => {
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
	const data = await db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(userId).get()
	const json = data.data() || { joined: [] }
	const newJoined = (json.joined || []).filter((x: string) => x !== boardId)
	await db
		.collection(`${process.env.FIRESTORE_PREFIX}-user`)
		.doc(userId)
		.update({
			joined: newJoined,
		})
}
export const userSubscribedList = async (userId: string) => {
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
	const data = await db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(userId).get()
	const json = data.data() || { joined: [] }
	return (json.joined || []) as string[]

}

export const userIsSubscribed = async (userId: string, boardId: string) => {
	const joined = await userSubscribedList(userId)
	return (joined as string[]).includes(boardId)
}

export const publicOrUserIsSubscribed = async (userId: string, boardId: string) => {
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
	const board = await db.collection(`${process.env.FIRESTORE_PREFIX}-board`).doc(boardId).get()
	if (!board.exists) {
		return false
	}
	const boardData = board.data()
	if (boardData?.visibility === 'public') {
		return true
	}
	const joined = await userSubscribedList(userId)
	return (joined as string[]).includes(boardId)
}
