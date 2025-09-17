'use client'
import {
	Box,
	Button,
	Heading,
	Text,
	useColorMode,
} from '@chakra-ui/react'
import Head from 'next/head'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import type { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export default function Home({ id }: { id: string }) {
	const { colorMode } = useColorMode()
	const { t } = useTranslation('common')
	const router = useRouter()
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
				<Heading textAlign="center" my={4}>
					{process.env.NEXT_PUBLIC_TITLE || 'TIPS Kanban'}
				</Heading>
				<Text>404 Not Found</Text>
				<NextLink href="/">
					<Button variant="link">
						Return to top page
					</Button>
				</NextLink>
			</Box>
		</>
	)
}
