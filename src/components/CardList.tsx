import type { ICard, IEditor } from '@/types'
import { Box } from '@chakra-ui/react'
import { useState } from 'react'
import CardItem from './CardItem'
import Droppable from './Droppable'

interface CardProps {
	listId: string
	listType: string
	cards: ICard[]
	title: string
	editor: IEditor
}
export default function CardList(props: CardProps) {
	const { listId = 'LIST', listType, cards, title, editor } = props

	return (
		<Box display="flex" flexDir="column" paddingBottom={0} transition="background-color 0.2s ease, opacity 0.1s ease" userSelect="none" w="250px" maxH="calc(100svh - 150px)">
			<Box overflowX="hidden" overflowY="auto" maxH="100%">
				<Box h="100%">
					<Box h="100%">
						<Box position="relative">
							<Droppable index={0} target={title} editor={editor} />
						</Box>
						{cards.map((card: ICard, index: number) => (
							<Box position="relative" key={card.id}>
								<CardItem isDragging={false} card={card} editor={editor} index={index} />
								<Droppable target={title} index={index + 1} editor={editor} />
							</Box>
						))}
						<Box position="relative">
							<Droppable index={cards.length + 1} target={title} editor={editor} />
						</Box>
					</Box>
				</Box>
			</Box>
		</Box>
	)
}
