import type { IAction, IBoard, ICardDetails, IState } from '@/types'

export const updateBoard = async (id: string, setLatest: IState<number>, targetCardId: string | undefined, action: IAction, data: IBoard, ordered?: string[]) => {
	try {
		const version = Math.floor(new Date().getTime() / 1000)
		setLatest(version)
		const res = await fetch('/api/board/update', {
			method: 'POST',
			body: JSON.stringify({ id, data, action, ordered, version, cardId: targetCardId }),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		if (res.ok) return true
	} catch {}
}
export const addCardUpdate = async (id: string, copyFrom?: string) => {
	try {
		const version = Math.floor(new Date().getTime() / 1000)
		const res = await fetch('/api/card/add', {
			method: 'POST',
			body: JSON.stringify({ id, version, copyFrom }),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		if (res.ok) return true
	} catch {}
}
export const updateMeta = async (id: string, setLatest: IState<number>, title: string, color: string, visibility: string) => {
	try {
		const version = Math.floor(new Date().getTime() / 1000)
		setLatest(version)
		const res = await fetch('/api/board/metaUpdate', {
			method: 'POST',
			body: JSON.stringify({ id, title, color, visibility, version }),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		if (res.ok) return true
	} catch {}
}
export const updateCard = async (id: string, latest: number, setLatest: IState<number>, action: IAction, data: ICardDetails, setIsUpdate: IState<boolean>, force: boolean) => {
	try {
		setIsUpdate(true)
		const version = Math.floor(new Date().getTime() / 1000)
		setLatest(version)
		const res = await fetch('/api/card/update', {
			method: 'POST',
			body: JSON.stringify({ id, data, version, checkLatest: latest, action, force }),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		if (res.ok) return true
	} finally {
		setIsUpdate(false)
	}
}
const readFileAsync = (file: File) => {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = async () => {
			const imgData = reader.result
			if (typeof imgData !== 'string') return reject()
			resolve(imgData)
		}
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}
export const upload = async (file: File) => {
	try {
		const mime = file.type
		const ext = file.name.split('.').pop() || ''
		const content = await readFileAsync(file)
		if (typeof content === 'string') {
			const uuid = self.crypto.randomUUID()
			const param = {
				name: file.name,
				path: `${uuid}.${ext}`,
				data: content.split(',')[1],
			}
			const d = await fetch('/api/upload', {
				method: 'POST',
				body: JSON.stringify(param),
				headers: {
					'Content-Type': 'application/json',
				},
			})
			const r = await d.json()
			console.log(r)
			return r.url
		}
	} catch (e) {
		return null
	}
}
