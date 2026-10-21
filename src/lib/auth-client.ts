import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { auth } from './auth'

export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>()],
})
export type Session = typeof authClient.$Infer.Session

export function useSession() {
	const result = authClient.useSession()
	return {
		...result,
		status: result.isPending ? 'loading' : result.data ? 'authenticated' : 'unauthenticated',
	}
}

export async function signOut() {
	const { error } = await authClient.signOut()
	if (!error) window.location.assign('/login')
}
