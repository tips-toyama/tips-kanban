import type { IBoard, IUser } from '@/types'

export const findColumn = (board: IBoard, cardId: string) => {
	const keys = Object.keys(board)
	for (const key of keys) {
		const cardIndex = board[key].findIndex((card) => card.id === cardId)
		if (cardIndex >= 0) return { key, cardIndex }
	}
	return { key: null, cardIndex: -1 }
}
export const findUser = (users: IUser[], userId: string) => {
	console.log(users, userId)
	return users.find((user) => user.id === userId)
}
