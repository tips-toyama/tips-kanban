import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import NextAuth, { type AuthOptions } from 'next-auth'
const config = {}
const provider: any = {
	...config,
	profile: async (profile: any) => {
		const attributes = profile
		return {
			id: attributes.id || attributes.sub,
			image: JSON.stringify(attributes),
			email: attributes.id || attributes.sub || attributes.email,
			name: attributes.name || attributes.displayName || attributes.display_name,
		}
	},
}
export const authOptions: AuthOptions = {
	// Configure one or more authentication providers
	providers: [provider],
	callbacks: {
		signIn: async ({ user }: any) => {
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
			const isUser = await db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(user.id).get()
			if (isUser.exists) return true
			await db.collection(`${process.env.FIRESTORE_PREFIX}-user`).doc(user.id).set({
				id: user.id,
				name: user.name,
				joined: []
			})
			return true
		},
	},
}
export default NextAuth(authOptions)
