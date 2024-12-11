'use client'

import type { IComment, IState, IUser } from '@/types'
import { Box, Button, Flex, Input, Text } from '@chakra-ui/react'
import React, { useEffect, useState } from 'react'
import '@mdxeditor/editor/style.css'
import { findUser } from '@/utils/search'

interface IProps {
	id: string
	userList: IUser[]
	isUpdating: boolean
	latest: number
	setLatest: IState<number>
	setIsUpdating: IState<boolean>
}
//const interval = 3000000
const interval = 60000
export const ComposerComment = ({ id, userList, isUpdating, setIsUpdating }: IProps) => {
	const [comments, setComments] = useState<IComment[]>([])
	const [comment, setComment] = useState('')
	const fetchComments = async () => {
		const res = await fetch(`/api/comment/get?id=${id}`)
		const data = await res.json()
		setComments(data.length ? data : [])
	}
	useEffect(() => {
		fetchComments()
		const timer = setInterval(() => {
			fetchComments()
		}, interval)
		return () => clearInterval(timer)
	}, [id])
	const send = async () => {
		setIsUpdating(true)
		try {
			await fetch('/api/comment/post', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id, text: comment }),
			})
			setComment('')
		} finally {
			fetchComments()
			setIsUpdating(false)
		}
	}
	return (
		<Box>
			<Text fontWeight="bold" fontSize={22} my={2}>
				コメント
			</Text>
			{comments.map((c) => (
				<Flex key={c.id}>
					<Box w="100%">
						<Text fontSize={14} color="gray.500">
							{findUser(userList, c.owner)?.name}
						</Text>
						<Box p={3} w="100%" borderRadius={10} bgColor="gray.50">
							<Text>{c.text}</Text>
						</Box>
					</Box>
				</Flex>
			))}
			<Flex mt={3}>
				<Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="コメントを入力" />
				<Button onClick={send} isDisabled={isUpdating} ml={2}>
					送信
				</Button>
			</Flex>
		</Box>
	)
}
