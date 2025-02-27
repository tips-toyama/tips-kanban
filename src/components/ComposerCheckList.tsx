'use client'

import type { ICardDetails, ICheckList, IState } from '@/types'
import { Box, Button, Checkbox, Flex, IconButton, Input, Text } from '@chakra-ui/react'
import React, { useState } from 'react'
import '@mdxeditor/editor/style.css'
import { updateCard } from '@/utils/update'
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon } from '@chakra-ui/icons'
import { useTranslation } from 'next-i18next'
import EditableText from './EditableText'
import { useWindowSize, checkSpUi } from '@/utils/useWindowSize'

interface IProps {
	id: string
	color: string
	data: ICardDetails
	setData: IState<ICardDetails>
	latest: number
	setLatest: IState<number>
	isUpdating: boolean
	setIsUpdating: IState<boolean>
	cardProgressUpdate: (id: string, checkList: number, checkListDone: number) => void
}
export const ComposerCheckList = ({ id: cardId, data, setData, color, cardProgressUpdate, isUpdating, setIsUpdating, latest, setLatest }: IProps) => {
	const [newCheckList, setNewCheckList] = useState('')
	const { t } = useTranslation('common')
	const [width] = useWindowSize()
	const isSpUi = checkSpUi(width)
	const checkListDoneUpdate = (id: string, done: boolean) => {
		const newCL: ICheckList[] = data.checkList.map((c) => (c.id === id ? { ...c, isDone: done } : c))
		const newData = { ...data }
		newData.checkList = newCL
		setData(newData)
		cardProgressUpdate(id, newCL.length, newCL.filter((c) => c.isDone).length)
		updateCard(cardId, latest, setLatest, 'doCheckList', newData, setIsUpdating, false)
	}
	const checkListTextUpdate = (id: string, text: string) => {
		const newCL: ICheckList[] = data.checkList.map((c) => (c.id === id ? { ...c, text } : c))
		const newData = { ...data }
		newData.checkList = newCL
		setData(newData)
		updateCard(cardId, latest, setLatest, 'changeCheckList', newData, setIsUpdating, false)
	}
	const checkListAdd = (text: string) => {
		setNewCheckList('')
		const newCL = [...data.checkList, { id: self.crypto.randomUUID(), text, isDone: false }]
		const newData = { ...data }
		newData.checkList = newCL
		setData(newData)
		updateCard(cardId, latest, setLatest, 'changeCheckList', newData, setIsUpdating, false)
	}
	const checkListRemove = (id: string) => {
		if (!confirm(t('confirmDelete'))) return
		const newCL: ICheckList[] = data.checkList.filter((c) => c.id !== id)
		const newData = { ...data }
		newData.checkList = newCL
		setData(newData)
		updateCard(cardId, latest, setLatest, 'changeCheckList', newData, setIsUpdating, false)
	}
	const checkListMove = (id: string, direction: 'up' | 'down') => {
		const index = data.checkList.findIndex((c) => c.id === id)
		if (index < 0) return
		const newCL = [...data.checkList]
		if (direction === 'up') {
			if (index === 0) return
			const tmp = newCL[index - 1]
			newCL[index - 1] = newCL[index]
			newCL[index] = tmp
		} else {
			if (index === newCL.length - 1) return
			const tmp = newCL[index + 1]
			newCL[index + 1] = newCL[index]
			newCL[index] = tmp
		}
		const newData = { ...data }
		newData.checkList = newCL
		setData(newData)
		updateCard(cardId, latest, setLatest, 'changeCheckList', newData, setIsUpdating, false)
	}

	return (
		<Box>
			<Text fontWeight="bold" fontSize={22} my={2}>
				{t('checkList')}
			</Text>
			<Flex flexDir="column">
				{data.checkList.map((c, i) => (
					<Flex key={c.id} justify="space-between">
						<Flex>
							<Checkbox isDisabled={isUpdating} isChecked={c.isDone} colorScheme={color} size="lg" onChange={(e) => checkListDoneUpdate(c.id, e.target.checked)} />
							<EditableText defaultValue={c.text} ml={2} onBlur={(e) => checkListTextUpdate(c.id, e.target.value)} inputProps={{ isReadOnly: isUpdating }} />
						</Flex>
						<Flex>
							<IconButton aria-label="Move to up" isDisabled={isUpdating || i === 0} icon={<ChevronUpIcon />} size={isSpUi ? 'sm' : 'xs'} variant="ghost" onClick={() => checkListMove(c.id, 'up')} />
							<IconButton
								aria-label="Move to down"
								isDisabled={isUpdating || i === data.checkList.length - 1}
								icon={<ChevronDownIcon />}
								size={isSpUi ? 'sm' : 'xs'}
								variant="ghost"
								onClick={() => checkListMove(c.id, 'down')}
							/>
							<IconButton aria-label="Delete" isDisabled={isUpdating} icon={<DeleteIcon />} size={isSpUi ? 'sm' : 'xs'} variant="ghost" colorScheme="red" onClick={() => checkListRemove(c.id)} />
						</Flex>
					</Flex>
				))}
				<form onSubmit={(e) => e.preventDefault()}>
					<Flex mt={3}>
						<Input value={newCheckList} readOnly={isUpdating} onChange={(e) => setNewCheckList(e.target.value)} placeholder={t('addCheckList')} />
						<Button ml={2} type="submit" isDisabled={isUpdating} onClick={() => checkListAdd(newCheckList)}>
							{t('add')}
						</Button>
					</Flex>
				</form>
			</Flex>
		</Box>
	)
}
