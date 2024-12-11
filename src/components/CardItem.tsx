'use client'
import type { ICard, IEditor } from '@/types'
import { CopyIcon, DeleteIcon, DragHandleIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, IconButton, Text } from '@chakra-ui/react'
import React, { useState } from 'react'

interface CardItemProps {
	card: ICard
	isDragging: boolean
	isClone?: boolean
	index: number
	editor: IEditor
}
function CardItem(props: CardItemProps) {
	const { card, isDragging, editor, index } = props
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
	const copyItem = () => {
		editor.copyItem(card.id)
		setIsContextMenuOpen(false)
	}
	const deleteItem = () => {
		editor.deleteItem(card.id)
		setIsContextMenuOpen(false)
	}

	return (
		<Flex
			onClick={() => !isContextMenuOpen && editor.openModal(card)}
			onContextMenu={(e) => {
				e.preventDefault()
				setIsContextMenuOpen(!isContextMenuOpen)
			}}
			border="2px solid"
			borderColor="gray.400"
			padding="8px"
			marginBottom="8px"
			borderRadius="8px"
			transition="border 0.1s ease"
			justify="space-between"
			_hover={{ borderColor: 'gray.500' }}
			backgroundColor="white"
			data-is-dragging={isDragging}
			data-testid={card.id}
			data-index={index}
			aria-label={`${card.text} card`}
			id={card.id}
			draggable={true}
			cursor="grab"
			onDragStart={(e) => editor.dragStart(e)}
			onDrag={(e) => editor.dragger(e, card.id)}
			onDragEnd={(e) => editor.draggerEnd()}
		>
			<Text>{card.text}</Text>
			{isContextMenuOpen && <Flex>
				<IconButton title="複製" aria-label="Duplicate" mr={1} icon={<CopyIcon />} size="xs" onClick={() => copyItem()} />
				<IconButton title="削除" aria-label="Delete" icon={<DeleteIcon />} size="xs" colorScheme="red" onClick={() => deleteItem()} />
			</Flex>}
		</Flex>
	)
}

export default React.memo(CardItem)
