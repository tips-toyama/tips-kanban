'use client'
import { Board } from '@/components/Board'
import type { IBoard, IBoardMetaState, IUser } from '@/types'
import { updateMeta } from '@/utils/update'
import { ArrowBackIcon, CheckIcon, EditIcon, SettingsIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, IconButton, Input, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverTrigger, Radio, RadioGroup, Spinner, Stack, Text, useToast } from '@chakra-ui/react'
import type { GetServerSideProps } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { signOut, useSession } from 'next-auth/react'
import Head from 'next/head'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import { useEffect, useState } from 'react'
import Avatar from 'boring-avatars'
const interval = 3000000
//const interval = 3000
export default function Home({ id }: { id: string }) {
	const { t } = useTranslation('common')
	const toast = useToast()
	const router = useRouter()
	const { data: session, status } = useSession()
	if (status === 'unauthenticated') {
		localStorage.setItem('redirect', router.asPath)
		return router.push('/api/auth/signin')
	}
	const [initVis, setInitVis] = useState('private')
	const [meta, setMeta] = useState<IBoardMetaState | null>(null)
	const [columns, setColumns] = useState<IBoard | null>(null)
	const [hasLatest, setHasLatest] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [order, setOrder] = useState<string[]>([])
	
	const [userMap, setUserMap] = useState<IUser[]>([])
	const [latest, setLatest] = useState(0)


	const getUsers = async () => {
		try {
			const res = await fetch('/api/user')
			const data = await res.json()
			setUserMap(data)
		} catch {
			console.error('Failed to fetch users')
		}
	}
	const init = async (silent: boolean) => {
		setIsLoading(true)
		setHasLatest(false)
		try {
			const res = await fetch(`/api/board/get?id=${id}`)
			const data = await res.json()
			setLatest((c) => {
				if (c > 0) setHasLatest(data.version !== c)
				return data.version
			})
			if (!silent) {
				setMeta({ title: data.title, color: data.color, visibility: data.visibility })
				setInitVis(data.visibility)
				setColumns(data.data)
				setOrder(data.order)
				document.title = `${data.title} - Kanban`
				return
			}
		} finally {
			setIsLoading(false)
		}
	}
	const deleteBoard = async () => {
		setIsLoading(true)
		if (!confirm(t('confirmDelete'))) return
		const res = await fetch('/api/board/delete', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ id }),
		})
		const data = await res.json()
		router.push('/')
	}
	useEffect(() => {
		init(false)
		getUsers()
		const timer = setInterval(() => {
			init(true)
		}, interval)
		return () => clearInterval(timer)
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
				<Flex h="40px" backgroundColor={`${meta?.color}.500`} w="100vw" color="white" align="center" px="10px" justify="space-between">
					<Flex align="center">
						<IconButton icon={<ArrowBackIcon />} aria-label="go to home" ml={2} onClick={() => router.push('/')} variant="outline" size="xs" colorScheme="whiteAlpha" color="white" />
						<Text fontSize={22} mx={3}>{meta?.title || ''}</Text>
						<Popover onClose={() => updateMeta(id, setLatest, meta?.title || '', meta?.color || 'blue', meta?.visibility || 'private')}>
							<PopoverTrigger>
								<IconButton icon={<EditIcon />} aria-label="edit" variant="outline" size="xs" colorScheme="whiteAlpha" color="white" />
							</PopoverTrigger>
							<PopoverContent color="black">
								<PopoverArrow />
								<PopoverCloseButton />
								<PopoverBody pt={8}>
									<Flex justify="space-between">
										<Text>{t('boardName')}</Text>
										<Button variant="link" colorScheme="red" onClick={() => deleteBoard()}>{t('boardDelete')}</Button>
									</Flex>
									<Input type="text" value={meta?.title} onChange={(e) => setMeta({ color: meta?.color || 'blue', title: e.target.value, visibility: meta?.visibility || 'private' })} />
									<Flex mt={3}>
										<IconButton
											aria-label="blue"
											onClick={() => setMeta({ title: meta?.title || '', color: 'blue', visibility: meta?.visibility || 'private' })}
											colorScheme="blue"
											size="xs"
											mx={1}
											icon={meta?.color === 'blue' ? <CheckIcon /> : undefined}
										/>
										<IconButton
											aria-label="green"
											onClick={() => setMeta({ title: meta?.title || '', color: 'green', visibility: meta?.visibility || 'private' })}
											colorScheme="green"
											size="xs"
											mx={1}
											icon={meta?.color === 'green' ? <CheckIcon /> : undefined}
										/>
										<IconButton
											aria-label="red"
											onClick={() => setMeta({ title: meta?.title || '', color: 'red', visibility: meta?.visibility || 'private' })}
											colorScheme="red"
											size="xs"
											mx={1}
											icon={meta?.color === 'red' ? <CheckIcon /> : undefined}
										/>
										<IconButton
											aria-label="purple"
											onClick={() => setMeta({ title: meta?.title || '', color: 'purple', visibility: meta?.visibility || 'private' })}
											colorScheme="purple"
											size="xs"
											mx={1}
											icon={meta?.color === 'purple' ? <CheckIcon /> : undefined}
										/>
										<IconButton
											aria-label="orange"
											onClick={() => setMeta({ title: meta?.title || '', color: 'orange', visibility: meta?.visibility || 'private' })}
											colorScheme="orange"
											size="xs"
											mx={1}
											icon={meta?.color === 'orange' ? <CheckIcon /> : undefined}
										/>
										<IconButton
											aria-label="gray"
											onClick={() => setMeta({ title: meta?.title || '', color: 'gray', visibility: meta?.visibility || 'private' })}
											colorScheme="gray"
											size="xs"
											mx={1}
											icon={meta?.color === 'gray' ? <CheckIcon /> : undefined}
										/>
									</Flex>
									<RadioGroup my={2} onChange={(e: any) => setMeta({ ...(meta || { title: '', color: 'blue' }), visibility: e })} value={meta?.visibility || 'private'}>
										<Stack direction="row">
											<Radio value="public" colorScheme={meta?.color}>{t('public')}</Radio>
											<Radio value="limited" colorScheme={meta?.color} isDisabled={initVis === 'public'}>{t('limited')}</Radio>
										</Stack>
									</RadioGroup>
									<Text>{t('shareLink')}</Text>
									<Input defaultValue={`${!!window ? window.location.origin : ''}/board/${id}`} readOnly onFocus={(e) => e.target.select()} />
								</PopoverBody>
							</PopoverContent>
						</Popover>
						{isLoading && <Spinner ml={2} size="md" />}
					</Flex>
					<Popover>
						<PopoverTrigger>
							<Avatar style={{ cursor: 'pointer' }} name={session?.user?.name || ''} size={30} variant="beam" />
						</PopoverTrigger>
						<PopoverContent color="black">
							<PopoverArrow />
							<PopoverCloseButton />
							<PopoverBody pt={8}>
								<Box>{session?.user?.name}</Box>
								<Button w="100%" onClick={() => signOut()}>
									{t('logout')}
								</Button>
								<Flex mt={2}>
									<NextLink href={`/board/${id}`} locale="en">
										<Button variant="link" isDisabled={router.locale === 'en'}>English</Button>
									</NextLink>
									<NextLink href={`/board/${id}`} locale="ja">
										<Button ml={2} variant="link" isDisabled={router.locale === 'ja'}>日本語</Button>
									</NextLink>
								</Flex>
							</PopoverBody>
						</PopoverContent>
					</Popover>
				</Flex>
				{hasLatest && (
					<Flex position="fixed" bgColor={`${meta?.color}.400`} color="white" zIndex={3} width="100vw" px="8px" py="2px" align="center">
						<Text>{t('hasNewData')}</Text>
						<Button colorScheme={meta?.color} ml={2} onClick={() => init(true)}>
							{t('refresh')}
						</Button>
					</Flex>
				)}
				{!!columns ? (
					<Box h="100svh" position="relative">
						<Board id={id} columns={columns} initOrder={order} setColumns={setColumns} color={meta?.color || 'blue'} setLatest={setLatest} userMap={userMap} />
					</Box>
				) : (
					<Flex w="100vw" h="100svh" justify="center" align="center">
						<Spinner size="xl" />
					</Flex>
				)}
			</Box>
		</>
	)
}
export const getServerSideProps: GetServerSideProps = async (context) => {
	const { id } = context.query

	return {
		props: {
			id,
			...(await serverSideTranslations(context.locale || 'en', [
				'common',
			])),
		}
	}
}
