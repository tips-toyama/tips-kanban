import { a } from 'framer-motion/client'

export interface ICard {
	id: string
	text: string
	checkList?: number
	checkListDone?: number
	assigned?: string[]
	deadline?: number
}
export interface IBoardMetaState {
	title: string
	color: string
	visibility: 'public' | 'limited' | 'private'
}
export interface IBoardMeta extends IBoardMetaState {
	id: string
}
export interface IBoard {
	[key: string]: ICard[]
}
export type IState<T> = (value: React.SetStateAction<T>) => void
export type IFilter = 'mine' | 'others' | 'orphan'
export type IEditor = {
	openModal: (card: ICard) => void
	add: (target: string, title: string) => void
	deleteItem: (target: string) => void
	copyItem: (target: string) => void
	changeColumnTitle: (title: string, newTitle: string) => boolean
	moveColumn: (title: string, direction: 'left' | 'right') => void
	dragStart: (e: React.DragEvent<HTMLDivElement>) => void
	dragger: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
	move: (target: string, index: number) => void
	draggerEnd: () => void
}
export interface IUser {
	id: string
	name: string
}
export interface IUserDB extends IUser {
	joined: string[]
}
export type IAction =
	| 'changeContent'
	| 'cardTitleUpdate'
	| 'delete'
	| 'add'
	| 'move'
	| 'changeCheckList'
	| 'doCheckList'
	| 'changeColumnTitle'
	| 'moveColumn'
	| 'addColumn'
	| 'content'
	| 'addAttachment'
	| 'copy'
	| 'cardUserUpdate'
	| 'cardDeadlineUpdate'
export interface IHistory {
	id: string
	owner: string
	action: IAction
	createdAtUnix: number
}
export interface IComment {
	id: string
	owner: string
	text: string
	createdAtUnix: number
}
export interface ICheckList {
	id: string
	text: string
	isDone: boolean
}
export interface IAttachment {
	url: string
	filename: string
	mime: string
}
export interface ICardDetails {
	content: string
	checkList: ICheckList[]
	attachments: IAttachment[]
}
