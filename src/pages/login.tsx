import { getServerSession, safeReturnPath } from '@/auth/server'
import { Alert, AlertIcon, Button, Container, Heading, Text } from '@chakra-ui/react'
import type { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'

export default function SignIn({ failure, callbackUrl }: InferGetServerSidePropsType<typeof getServerSideProps>) {
	const { t } = useTranslation('common')
	const [busy, setBusy] = useState(false)
	const [now, setNow] = useState(0)
	useEffect(() => {
		setNow(Date.now())
		const timer = window.setInterval(() => setNow(Date.now()), 1000)
		return () => window.clearInterval(timer)
	}, [])
	const waiting = failure.retryAt > now
	return (
		<Container centerContent h="100svh" justifyContent="center">
			<Heading my={2}>{t('login')}</Heading>
			{failure.code && (
				<Alert status="error" my={4} role="alert">
					<AlertIcon />
					<div>
						<Text>{t('authFailed')}</Text>
						<Text fontSize="sm">
							{failure.code}
							{failure.status ? ` (HTTP ${failure.status})` : ''}
						</Text>
						{failure.id && <Text fontSize="sm">error_id: {failure.id}</Text>}
					</div>
				</Alert>
			)}
			<Button
				size="lg"
				isLoading={busy}
				isDisabled={waiting}
				onClick={() => {
					setBusy(true)
					window.location.assign(`/api/auth/signin/tips?${new URLSearchParams({ callbackUrl })}`)
				}}
			>
				{t('signIn', { method: 'TIPSアカウント' })}
			</Button>
			{waiting && <Text mt={2}>{t('authRetryLater')}</Text>}
		</Container>
	)
}
export async function getServerSideProps(context: GetServerSidePropsContext) {
	context.res.setHeader('Cache-Control', 'no-store')
	context.res.setHeader('Referrer-Policy', 'no-referrer')
	try {
		const session = await getServerSession(context.req, context.res)
		if (session && !context.query.error) return { redirect: { destination: '/', permanent: false } }
	} catch {
		/* The login page must remain available during configuration or database failures. */
	}
	const safe = (value: unknown) => (typeof value === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(value) ? value : '')
	const retryAt = Number(context.query.retry_at)
	return {
		props: {
			callbackUrl: safeReturnPath(context.query.callbackUrl),
			failure: {
				code: safe(context.query.error),
				status: safe(context.query.status),
				id: safe(context.query.error_id),
				retryAt: Number.isFinite(retryAt) ? Math.min(retryAt, Date.now() + 86400000) : 0,
			},
			...(await serverSideTranslations(context.locale || 'en', ['common'])),
		},
	}
}
