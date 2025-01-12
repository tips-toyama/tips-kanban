'use client'
import type { ICard, IEditor, IUser } from '@/types'
import { CopyIcon, DeleteIcon } from '@chakra-ui/icons'
import { IoCheckboxOutline } from 'react-icons/io5'
import { AvatarGroup, Box, Flex, IconButton, Text, Icon, Badge } from '@chakra-ui/react'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'
import UserIcon from './UserIcon'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ja'
import { useRouter } from 'next/router'
dayjs.extend(relativeTime)

interface CardItemProps {
	card: ICard
	isDragging: boolean
	isClone?: boolean
	index: number
	editor: IEditor
	userMap: IUser[]
}
function CardItem(props: CardItemProps) {
	const { card, isDragging, editor, index } = props
	const { locale } = useRouter()
	const { t } = useTranslation('common')
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
	const copyItem = () => {
		editor.copyItem(card.id)
		setIsContextMenuOpen(false)
	}
	const deleteItem = () => {
		editor.deleteItem(card.id)
		setIsContextMenuOpen(false)
	}
	const deadline = dayjs(card?.deadline ? card?.deadline * 1000 : undefined)

	return (
		<Box
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
			<Flex justify="space-between">
				<Text>{card.text}</Text>
				{isContextMenuOpen && <Flex>
					<IconButton title={t('duplicate')} aria-label="Duplicate" mr={1} icon={<CopyIcon />} size="xs" onClick={() => copyItem()} />
					<IconButton title={t('delete')} aria-label="Delete" icon={<DeleteIcon />} size="xs" colorScheme="red" onClick={() => deleteItem()} />
				</Flex>}
			</Flex>
			<Flex align="center">
				{(card.checkList || 0) > 0 && <Flex>
					<Icon as={IoCheckboxOutline} />
					<Text>{card.checkListDone}/{card.checkList}</Text>
				</Flex>}
				{card.deadline && <Badge mr={2} colorScheme={deadline.isAfter() ? 'green' : 'red'}>{deadline.locale(locale || 'en').fromNow()}</Badge>}
				{(card.assigned && card.assigned.length > 0) && <AvatarGroup size="xs" max={5}>{card.assigned.map((user) => <UserIcon key={user} user={user} userMap={props.userMap} size="xs" />)}</AvatarGroup>}
			</Flex>
		</Box>
	)
}

export default React.memo(CardItem)
