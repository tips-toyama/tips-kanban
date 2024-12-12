'use client'

import type { IBoard, ICard, ICardDetails, IState } from '@/types'
import { findColumn } from '@/utils/search'
import { addCardUpdate, updateBoard as update } from '@/utils/update'
import { useWindowSize } from '@/utils/useWindowSize'
import { CopyIcon, DeleteIcon } from '@chakra-ui/icons'
import {
	Box,
	Button,
	Flex,
	IconButton,
	Input,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalHeader,
	ModalOverlay,
	Spinner,
	Text,
	useDisclosure,
} from '@chakra-ui/react'
import type React from 'react'
import { useRef, useState } from 'react'
import Column from './Column'
import { Composer } from './Composer'
import EditableText from './EditableText'

interface IProps {
	id: string
	columns: IBoard
	color: string
	initOrder: string[]
	setColumns: IState<IBoard | null>
	setLatest: IState<number>
}
export const Board = ({ id, columns, setColumns, initOrder, color, setLatest }: IProps) => {
	const [width] = useWindowSize()
	const [ordered, setOrdered] = useState(initOrder)
	const [editingCard, setEditingCard] = useState<{ id: string; text: string; latest: number } | null>(null)
	const [modalLoading, setModalLoading] = useState(false)
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
	const [cardDetails, setCardDetails] = useState<ICardDetails | null>(null)
	const [draggingCard, setDraggingCard] = useState('')
	const [newColumn, setNewColumn] = useState('')
	const ref = useRef<HTMLDivElement>(null)
	const { isOpen, onOpen, onClose } = useDisclosure()

	const editor = {
		openModal: (card: ICard) => {
			const fn = async () => {
				onOpen()
				setModalLoading(true)
				setEditingCard(null)
				try {
					const res = await fetch(`/api/card/get?id=${card.id}`)
					const data = await res.json()
					setCardDetails(data.data)
					setEditingCard({ ...card, latest: data.version })
				} catch {
					setEditingCard(null)
					onClose()
				} finally {
					setModalLoading(false)
				}
			}
			fn()
		},
		add: (target: string, title: string) => {
			const newColumns = { ...columns }
			const newId = self.crypto.randomUUID()
			newColumns[target].push({ id: newId, text: title })
			setColumns(newColumns)
			update(id, setLatest, undefined, 'add', newColumns)
			addCardUpdate(newId)
		},
		deleteItem: (targetId: string) => {
			const newColumns = { ...columns }
			const { key: targetKey } = findColumn(columns, targetId)
			if (!targetKey) return
			newColumns[targetKey] = newColumns[targetKey].filter((item) => item.id !== targetId)
			setColumns(newColumns)
			update(id, setLatest, targetId, 'delete', newColumns)
		},
		copyItem: (targetId: string) => {
			const newColumns = { ...columns }
			const { key: targetKey, cardIndex } = findColumn(columns, targetId)
			if (!targetKey) return
			const card = columns[targetKey][cardIndex]
			const newId = self.crypto.randomUUID()
			newColumns[targetKey].splice(cardIndex, 0, { checkList: card.checkList, checkListDone: 0, text: `${card.text} copy`, id: newId })
			setColumns(newColumns)
			update(id, setLatest, targetId, 'copy', newColumns)
			addCardUpdate(newId, targetId)
		},
		changeColumnTitle: (title: string, newTitle: string) => {
			if (title === newTitle) return false
			if (ordered.includes(newTitle)) return false
			const newColumns = { ...columns }
			newColumns[newTitle] = newColumns[title]
			delete newColumns[title]
			const newOrder = ordered.map((key) => (key === title ? newTitle : key))
			setOrdered(newOrder)
			setColumns(newColumns)
			update(id, setLatest, undefined, 'changeColumnTitle', newColumns, newOrder)
			return true
		},
		moveColumn: (title: string, direction: 'left' | 'right') => {
			const index = ordered.indexOf(title)
			if (index === -1) return
			const newOrdered = [...ordered]
			if (direction === 'left' && index !== 0) {
				const temp = newOrdered[index - 1]
				newOrdered[index - 1] = newOrdered[index]
				newOrdered[index] = temp
			}
			if (direction === 'right' && index !== newOrdered.length - 1) {
				const temp = newOrdered[index + 1]
				newOrdered[index + 1] = newOrdered[index]
				newOrdered[index] = temp
			}
			setOrdered(newOrdered)
			update(id, setLatest, undefined, 'moveColumn', columns, newOrdered)
		},
		dragStart: (e: React.DragEvent<HTMLDivElement>) => {
			e.stopPropagation()
			e.dataTransfer.setData('text/plain', 'card')
			e.dataTransfer.effectAllowed = 'move'
		},
		dragger: (e: React.DragEvent<HTMLDivElement>, cardId: string) => {
			setDraggingCard(cardId)
			const x = e.clientX
			const w = window.innerWidth
			if (x > w - Math.min(150, w / 2)) {
				const k = Math.min(150, w / 2) - (w - x)
				const speed = 1.02 ** k
				ref.current?.scrollBy(speed, 0)
			}
			if (x < Math.min(150, w / 2)) {
				const k = x
				const speed = 1.02 ** k
				ref.current?.scrollBy(-speed, 0)
			}
		},
		draggerEnd: () => setDraggingCard(''),
		move: (target: string, index: number) => {
			const { key: targetKey, cardIndex } = findColumn(columns, draggingCard)
			if (!targetKey) return
			const card = columns[targetKey][cardIndex]
			const isSameColumn = targetKey === target
			const newColumns = { ...columns }
			newColumns[targetKey] = newColumns[targetKey].filter((item) => item.id !== draggingCard)
			newColumns[target].splice(isSameColumn ? index - 1 : index, 0, card)
			setColumns(newColumns)
			update(id, setLatest, draggingCard, 'move', newColumns)
		},
	}
	const cardTitleUpdate = (cardId: string, newTitle: string, oldValue: string) => {
		if (newTitle === oldValue) return
		setEditingCard({ id: cardId, text: newTitle, latest: editingCard?.latest || 0 })
		const { key: targetKey, cardIndex } = findColumn(columns, cardId)
		const newColumns = { ...columns }
		if (!targetKey) return
		newColumns[targetKey][cardIndex].text = newTitle
		setColumns(newColumns)
		update(id, setLatest, cardId, 'cardTitleUpdate', newColumns)
	}
	const cardProgressUpdate = (cardId: string, checkList: number, checkListDone: number) => {
		const { key: targetKey, cardIndex } = findColumn(columns, cardId)
		const newColumns = { ...columns }
		if (!targetKey) return
		newColumns[targetKey][cardIndex].checkList = checkList
		newColumns[targetKey][cardIndex].checkListDone = checkListDone
		setColumns(newColumns)
	}
	const addColumn = () => {
		const newColumns = { ...columns }
		newColumns[newColumn] = []
		setColumns(newColumns)
		setOrdered([...ordered, newColumn])
		setNewColumn('')
		update(id, setLatest, undefined, 'addColumn', newColumns, [...ordered, newColumn])
	}

	return (
		<>
			<Modal closeOnOverlayClick={!hasUnsavedChanges} isCentered={true} scrollBehavior="inside" blockScrollOnMount={false} isOpen={isOpen} onClose={onClose} size={modalLoading ? 'sm' : width < 600 ? 'full' : '3xl'}>
				<ModalOverlay />
				{editingCard ? (
					<ModalContent>
						<ModalHeader>
							<Flex justify="space-between">
								<EditableText textProps={{ fontSize: 32 }} defaultValue={editingCard.text} onBlur={(e) => cardTitleUpdate(editingCard.id, e.target.value, editingCard.text)} />
								{!modalLoading && (
									<Flex mr="24px" pos="relative" >
										<IconButton title="複製" size="xs" onClick={() => editor.copyItem(editingCard.id)} icon={<CopyIcon />} aria-label="Copy this card" />
										<IconButton title="削除" size="xs" ml={1} colorScheme="red" onClick={() => editor.deleteItem(editingCard.id)} icon={<DeleteIcon />} aria-label="Delete this card" />
									</Flex>
								)}
							</Flex>
							<ModalCloseButton isDisabled={hasUnsavedChanges} mb={2} />
						</ModalHeader>
						<ModalBody>
							{!modalLoading && cardDetails ? (
								<Composer setHasUnsavedChanges={setHasUnsavedChanges} id={editingCard.id} data={cardDetails} cardProgressUpdate={cardProgressUpdate} color={color} latest={editingCard.latest} />
							) : (
								<Flex mb={10} justify="center" align="center">
									<Spinner />
								</Flex>
							)}
						</ModalBody>
					</ModalContent>
				) : (
					<ModalContent>
						<Spinner />
					</ModalContent>
				)}
			</Modal>
			<Box>
				<Box h="calc(100svh - 50px)" w="100%" mt={3} display="inline-flex" overflowX="scroll" ref={ref}>
					{ordered.map((key, index) => (
						<Column key={key} index={index} title={key} cards={columns[key]} isLast={index === ordered.length - 1} color={color} editor={editor} />
					))}
					<Box backgroundColor="white" border="1px solid" borderColor="gray.300" borderRadius={5} p={5} flexShrink={0} height={100}>
						<Text>カラムを追加</Text>
						<Flex>
							<Input value={newColumn} onChange={(e) => setNewColumn(e.target.value)} />
							<Button ml={2} variant="outline" onClick={() => addColumn()}>
								追加
							</Button>
						</Flex>
					</Box>
				</Box>
			</Box>
		</>
	)
}
