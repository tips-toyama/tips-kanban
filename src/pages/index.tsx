'use client'
import type { IBoardMeta } from '@/types'
import { CheckIcon, MoonIcon, RepeatIcon, SunIcon } from '@chakra-ui/icons'
import { Avatar, Box, Button, Flex, IconButton, Input, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverTrigger, Radio, RadioGroup, Spinner, Stack, Text, color, useColorMode } from '@chakra-ui/react'
import type { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { signOut, useSession } from 'next-auth/react'
import Head from 'next/head'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useWindowSize, checkSpUi } from '@/utils/useWindowSize'

export default function Home({ id }: { id: string }) {
	const { colorMode, setColorMode } = useColorMode()
	const { t } = useTranslation('common')
	const router = useRouter()
	const [width] = useWindowSize()
	const isSpUi = checkSpUi(width)
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
		if (redirect && redirect !== 'undefined' && redirect !== '/board/undefined') {
			localStorage.removeItem('redirect')
			router.push(redirect)
		}
	}, [])
	return (
		<>
			<Head>
				<title>{process.env.NEXT_PUBLIC_TITLE || 'TIPS Kanban'}</title>
				<meta name="description" content={process.env.NEXT_PUBLIC_TITLE || 'TIPS Kanban'} />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
				<style>{`body { background-color: ${colorMode === 'dark' ? '#111' : '#eee'}; overflow: auto;}`}</style>
			</Head>
			<Box>
				<Flex h={isSpUi ? '50px' : '40px'} backgroundColor="blue.500" w="100vw" color="white" align="center" px="10px" justify="space-between">
					<Flex>
						<Text fontSize={22}>{process.env.NEXT_PUBLIC_TITLE || 'TIPS Kanban'}</Text>
						{isLoading && <Spinner ml={2} size="md" />}
					</Flex>
					<Popover>
						<PopoverTrigger>
							<Avatar cursor="pointer" name={session?.user?.name || ''} size={isSpUi ? 'sm' : 'xs'} />
						</PopoverTrigger>
						<PopoverContent color={colorMode === 'dark' ? 'white' : 'black'}>
							<PopoverArrow />
							<PopoverCloseButton />
							<PopoverBody pt={8}>
								<Box>{session?.user?.name}</Box>
								<Button w="100%" onClick={() => {
									localStorage.removeItem('chakra-ui-color-mode')
									signOut()
								}}>
									{t('logout')}
								</Button>
								<Flex justify="space-between" mt={2} align="center">
									<Flex>
										<NextLink href="/" locale="en">
											<Button variant="link" isDisabled={router.locale === 'en'}>English</Button>
										</NextLink>
										<NextLink href="/" locale="ja">
											<Button ml={2} variant="link" isDisabled={router.locale === 'ja'}>日本語</Button>
										</NextLink>
									</Flex>
									<Flex>
										<IconButton mr={2} colorScheme="yellow" onClick={() => setColorMode('light')} isDisabled={colorMode === 'light'} aria-label="Switch to Lightmode" icon={<SunIcon />} />
										<IconButton onClick={() => setColorMode('dark')} colorScheme="teal" isDisabled={colorMode === 'dark'} aria-label="Switch to Darkmode" icon={<MoonIcon />} />
									</Flex>
								</Flex>
							</PopoverBody>
						</PopoverContent>
					</Popover>
				</Flex>
				<Flex p={5} align="center">
					<Text fontSize={22}>{t('greeting', { name: session?.user?.name })}</Text>
					<IconButton icon={<RepeatIcon />} aria-label="refresh" onClick={() => init()} />
				</Flex>
				<Flex flexWrap="wrap" px={5} overflowY="scroll">
					{boards.map((b, i) => (
						<NextLink key={b.id} href={`/board/${b.id}`}>
							<Box m={3} p={3} bgColor="white" w={150} h={150} backgroundColor={`${b.color}.500`} color="white" borderRadius={5} my={2}>
								{b.title}
							</Box>
						</NextLink>
					))}
					<Popover>
						<PopoverTrigger>
							<Flex m={3} cursor="pointer" p={3} bgColor="white" w={150} h={150} backgroundColor={colorMode === 'dark' ? 'gray.500' : 'gray.50'} borderRadius={5} my={2} align="center" justify="center">
								<Text fontWeight="bold">{t('addBoard')}</Text>
							</Flex>
						</PopoverTrigger>
						<PopoverContent color={colorMode === 'dark' ? 'white' : 'black'}>
							<PopoverArrow />
							<PopoverCloseButton />
							<PopoverBody pt={8}>
								<Text>{t('addBoard')}</Text>
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
										<Radio value="public" colorScheme={color}>{t('public')}</Radio>
										<Radio value="limited" colorScheme={color}>{t('limited')}</Radio>
									</Stack>
								</RadioGroup>
								<Button w="100%" colorScheme={color} onClick={() => addBoard()} isLoading={isLoading}>
									{t('add')}
								</Button>
							</PopoverBody>
						</PopoverContent>
					</Popover>
				</Flex>
			</Box>
			<Box p={2} w="100vw">
				<Flex mt={2} align="center" justify="space-between">
					<Flex>
						<NextLink href={`/board/${id}`} locale="en">
							<Button variant="link" isDisabled={router.locale === 'en'}>English</Button>
						</NextLink>
						<NextLink href={`/board/${id}`} locale="ja">
							<Button ml={2} variant="link" isDisabled={router.locale === 'ja'}>日本語</Button>
						</NextLink>
					</Flex>
				</Flex>
			</Box>
		</>
	)
}
export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await getServerSession(context.req, context.res, {})
	if (!session) return { redirect: { destination: '/api/auth/signin', permanent: false } }
	return {
		props: {
			...(await serverSideTranslations(context.locale || 'en', [
				'common',
			])),
		}
	}
}
