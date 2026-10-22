/** email intentionally contains the account ID for existing board memberships. */
export type Session = {
	user: { email: string; name: string; image?: string | null }
	expires: string
}
