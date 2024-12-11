'use client'
import type { IBoardMeta } from '@/types'
import { CheckIcon, RepeatIcon, SettingsIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, IconButton, Input, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverTrigger, Radio, RadioGroup, Spinner, Stack, Text, color } from '@chakra-ui/react'
import type { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { signOut, useSession } from 'next-auth/react'
import Head from 'next/head'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import { useEffect, useState } from 'react'
export default function Home({ id }: { id: string }) {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [newBoard, setNewBoard] = useState('')
	const [visibility, setVisibility] = useState('public')
	const [color, setColor] = useState('blue')
	const [boards, setBoards] = useState<IBoardMeta[]>([])
	const { data: session } = useSession()
	const init = async () => {
		setIsLoading(true)
		try {
			const res = await fetch('/api/board/list')
			const data = await res.json()
			setBoards(data)
		} finally {
			setIsLoading(false)
		}
	}
	const addBoard = async () => {
		setIsLoading(true)
		if (newBoard === '') return
		const res = await fetch('/api/board/add', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ title: newBoard, color, visibility }),
		})
		await res.json()
		init()
		setNewBoard('')
		setColor('blue')
		setVisibility('public')
	}
	useEffect(() => {
		init()
		const redirect = localStorage.getItem('redirect')
		if (redirect) {
			localStorage.removeItem('redirect')
			router.push(redirect)
		}
	}, [])
	return (
		<>
			<Head>
				<title>Kanban</title>
				<meta name="description" content="TIPS Kanvan" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
				<style>{'body { background-color: #eee; overflow: hidden;}'}</style>
			</Head>
			<Box>
				<Flex h="40px" backgroundColor="blue.500" w="100vw" color="white" align="center" px="10px" justify="space-between">
					<Flex>
						<Text fontSize={22}>Kanban</Text>
						{isLoading && <Spinner ml={2} size="md" />}
					</Flex>
					<Popover>
						<PopoverTrigger>
							<IconButton icon={<SettingsIcon />} aria-label="edit" ml={2} variant="outline" size="xs" colorScheme="whiteAlpha" color="white" />
						</PopoverTrigger>
						<PopoverContent color="black">
							<PopoverArrow />
							<PopoverCloseButton />
							<PopoverBody pt={8}>
								<Box>{session?.user?.name}</Box>
								<Button w="100%" onClick={() => signOut()}>
									ログアウト
								</Button>
							</PopoverBody>
						</PopoverContent>
					</Popover>
				</Flex>
				<Flex p={5} align="center">
					<Text fontSize={22}>こんにちは、{session?.user?.name}さん。</Text>
					<IconButton icon={<RepeatIcon />} aria-label="refresh" onClick={() => init()} />
				</Flex>
				<Flex flexWrap="wrap" px={5}>
					{boards.map((b, i) => (
						<NextLink key={b.id} href={`/board/${b.id}`}>
							<Box m={3} p={3} bgColor="white" w={150} h={150} backgroundColor={`${b.color}.500`} color="white" borderRadius={5} my={2}>
								{b.title}
							</Box>
						</NextLink>
					))}
					<Popover>
						<PopoverTrigger>
							<Flex m={3} cursor="pointer" p={3} bgColor="white" w={150} h={150} backgroundColor="gray.50" borderRadius={5} my={2} align="center" justify="center">
								<Text fontWeight="bold">ボードを追加</Text>
							</Flex>
						</PopoverTrigger>
						<PopoverContent color="black">
							<PopoverArrow />
							<PopoverCloseButton />
							<PopoverBody pt={8}>
								<Text>ボードを追加</Text>
								<Input value={newBoard} onChange={(e) => setNewBoard(e.target.value)} />
								<Flex mt={3}>
									<IconButton aria-label="blue" onClick={() => setColor('blue')} colorScheme="blue" size="xs" mx={1} icon={color === 'blue' ? <CheckIcon /> : undefined} />
									<IconButton aria-label="green" onClick={() => setColor('green')} colorScheme="green" size="xs" mx={1} icon={color === 'green' ? <CheckIcon /> : undefined} />
									<IconButton aria-label="red" onClick={() => setColor('red')} colorScheme="red" size="xs" mx={1} icon={color === 'red' ? <CheckIcon /> : undefined} />
									<IconButton aria-label="purple" onClick={() => setColor('purple')} colorScheme="purple" size="xs" mx={1} icon={color === 'purple' ? <CheckIcon /> : undefined} />
									<IconButton aria-label="orange" onClick={() => setColor('orange')} colorScheme="orange" size="xs" mx={1} icon={color === 'orange' ? <CheckIcon /> : undefined} />
									<IconButton aria-label="gray" onClick={() => setColor('gray')} colorScheme="gray" size="xs" mx={1} icon={color === 'gray' ? <CheckIcon /> : undefined} />
								</Flex>
								<RadioGroup my={2} onChange={(e: any) => setVisibility(e)} value={visibility}>
									<Stack direction="row">
										<Radio value="public" colorScheme={color}>公開</Radio>
										<Radio value="limited" colorScheme={color}>限定公開</Radio>
									</Stack>
								</RadioGroup>
								<Button w="100%" colorScheme={color} onClick={() => addBoard()} isLoading={isLoading}>
									追加
								</Button>
							</PopoverBody>
						</PopoverContent>
					</Popover>
				</Flex>
			</Box>
		</>
	)
}
export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await getServerSession(context.req, context.res, {})
	if (!session) return { redirect: { destination: '/api/auth/signin', permanent: false } }
	return { props: {} }
}
