'use client'

import type { ICard, IEditor, IFilter, IUser } from '@/types'
import { AddIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, IconButton, Input, useColorMode } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import CardList from './CardList'
import { useTranslation } from 'next-i18next'
import type { Session } from 'next-auth'

interface IProps {
	index: number
	title: string
	cards: ICard[]
	color: string
	editor: IEditor
	isLast: boolean
	userMap: IUser[]
	session: Session | null
	filter: IFilter[]
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const Column = ({ title, index, cards, color, editor, isLast, userMap, session, filter }: IProps) => {
	const { t } = useTranslation('common')
	const { colorMode } = useColorMode()
	const [isAdding, setIsAdding] = useState(false)
	const [newCard, setNewCard] = useState('')
	const [inColumnTitleEdit, setInColumnTitleEdit] = useState(false)
	const [columnTitle, setColumnTitle] = useState(title)
	const ref = useRef<HTMLInputElement>(null)
	const addToggle = async () => {
		setIsAdding(true)
		while (!ref.current) {
			await sleep(100)
		}
		ref.current.focus()
	}
	const add = () => {
		editor.add(title, newCard)
		setNewCard('')
		setIsAdding(false)
	}
	const changeColumnTitle = (title: string, newTitle: string) => {
		const result = editor.changeColumnTitle(title, newTitle)
		if (!result) setColumnTitle(title)
		setInColumnTitleEdit(false)
	}

	return (
		<Box h="100svh" mx="8px" display="flex" flexDir="column" borderTopRadius="4px" borderBottomRadius="8px">
			<Flex alignItems="center" h="40px" px="8px" justifyContent="space-between" backgroundColor={`${color}.600`} transition="background-color 0.2s ease" borderTopRadius="4px" flexShrink={0}>
				<IconButton
					aria-label="Move to left"
					colorScheme="whiteAlpha"
					color="white"
					isDisabled={index === 0}
					icon={<ChevronLeftIcon />}
					size="xs"
					variant="ghost"
					onClick={() => editor.moveColumn(title, 'left')}
				/>
				{!inColumnTitleEdit ? (
					<Button variant="ghost" colorScheme="whiteAlpha" color="white" size="sm" onClick={() => setInColumnTitleEdit(true)}>
						{columnTitle}
					</Button>
				) : (
					<Input value={columnTitle} color="white" autoFocus onFocus={(e) => e.target.select()} onChange={(e) => setColumnTitle(e.target.value)} onBlur={(e) => changeColumnTitle(title, e.target.value)} />
				)}

				<IconButton
					aria-label="Move to down"
					colorScheme="whiteAlpha"
					color="white"
					isDisabled={isLast}
					icon={<ChevronRightIcon />}
					size="xs"
					variant="ghost"
					onClick={() => editor.moveColumn(title, 'right')}
				/>
			</Flex>
			<Box backgroundColor={colorMode === 'dark' ? 'gray.800' : 'gray.200'} borderBottomRadius="8px" maxH="100%" p="8px">
				<CardList listId={title} title={title} editor={editor} cards={cards} userMap={userMap} session={session} filter={filter} />
				{isAdding ? (
					<form>
						<Flex py="5px">
							<Input
								ref={ref}
								placeholder={t('cardName')}
								size="md"
								backgroundColor={colorMode === 'dark' ? 'gray.700' : 'white'}
								borderRadius="8px"
								onBlur={() => {
									setNewCard('')
									setIsAdding(false)
								}}
								value={newCard}
								onChange={(e) => setNewCard(e.target.value)}
							/>
							<Button size="md" ml="3px" leftIcon={<AddIcon />} type="submit" onClick={() => add()} onMouseDown={(e) => e.preventDefault()}>
								{t('add')}
							</Button>
						</Flex>
					</form>
				) : (
					<Box py="5px">
						<Button size="md" w="100%" leftIcon={<AddIcon />} onClick={() => addToggle()}>
							{t('addCard')}
						</Button>
					</Box>
				)}
			</Box>
		</Box>
	)
}
export default Column
