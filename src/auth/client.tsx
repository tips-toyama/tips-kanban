import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import type { Session } from './types'

type State = { data: Session | null; status: 'loading' | 'authenticated' | 'unauthenticated' }
const Context = createContext<State>({ data: null, status: 'loading' })
export function SessionProvider({ children }: { children: ReactNode }) {
	const [failed, setFailed] = useState(false)
	const [state, setState] = useState<State>({ data: null, status: 'loading' })
	useEffect(() => {
		let active = true
		const update = async () => {
			try {
				const response = await fetch('/api/auth/session', { cache: 'no-store' })
				if (!response.ok) throw new Error('session_unavailable')
				const data: Session | null = await response.json()
				if (active) {
					setFailed(false)
					setState({ data, status: data ? 'authenticated' : 'unauthenticated' })
				}
			} catch {
				if (active) setFailed(true)
			}
		}
		void update()
		window.addEventListener('focus', update)
		const timer = window.setInterval(update, 60000)
		return () => {
			active = false
			window.removeEventListener('focus', update)
			window.clearInterval(timer)
		}
	}, [])
	return (
		<Context.Provider value={state}>
			{failed && (
				<div role="alert">
					Session unavailable.{' '}
					<button type="button" onClick={() => window.location.reload()}>
						Retry
					</button>
				</div>
			)}
			{children}
		</Context.Provider>
	)
}
export const useSession = () => useContext(Context)
export async function signOut() {
	const response = await fetch('/api/auth/signout', { method: 'POST', cache: 'no-store' })
	if (response.ok) window.location.assign('/login')
}
