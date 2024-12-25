import type { ICard, IEditor, IFilter, IUser } from '@/types'
import { Box } from '@chakra-ui/react'
import { useState } from 'react'
import CardItem from './CardItem'
import Droppable from './Droppable'
import type { Session } from 'next-auth'

interface CardProps {
	listId: string
	cards: ICard[]
	title: string
	editor: IEditor
	userMap: IUser[]
	session: Session | null
	filter: IFilter[]
}
export default function CardList(props: CardProps) {
	const { cards, title, editor, userMap, session, filter } = props
	const myId = userMap.find((d) => session?.user?.name === d.name)?.id
	const showCards = cards.filter((card) => {
		if (filter.includes('mine') && card.assigned?.includes(myId || '')) return true
		if (filter.includes('others') && (card.assigned && card.assigned.length && !card.assigned.includes(myId || ''))) return true
		if (filter.includes('orphan') && (!card.assigned || !card.assigned.length)) return true
		return false
	})

	return (
		<Box display="flex" flexDir="column" paddingBottom={0} transition="background-color 0.2s ease, opacity 0.1s ease" userSelect="none" w="250px" maxH="calc(100svh - 150px)">
			<Box overflowX="hidden" overflowY="auto" maxH="100%">
				<Box h="100%">
					<Box h="100%">
						<Box position="relative">
							<Droppable index={0} target={title} editor={editor} />
						</Box>
						{showCards.map((card: ICard, index: number) => (
							<Box position="relative" key={card.id}>
								<CardItem isDragging={false} card={card} editor={editor} index={index} userMap={userMap} />
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
