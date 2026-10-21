import { authClient } from '@/lib/auth-client'
import { getServerSession } from '@/lib/auth-session'
import { Button, Container, Heading, Text } from '@chakra-ui/react'
import type { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

export default function SignIn() {
	const { t } = useTranslation('common')
	const router = useRouter()
	const [pending, setPending] = useState(false)
	const [failed, setFailed] = useState(false)
	const started = useRef(false)
	const signIn = async () => {
		setPending(true)
		setFailed(false)
		try {
			const { error } = await authClient.signIn.social({ provider: 'tips', callbackURL: '/', errorCallbackURL: '/login' })
			if (error) setFailed(true)
		} catch {
			setFailed(true)
		} finally {
			setPending(false)
		}
	}
	useEffect(() => {
		if (!router.isReady || started.current || router.query.error) return
		if (process.env.NEXT_PUBLIC_SIGNIN_METHOD === 'tips') {
			started.current = true
			void signIn()
		}
	}, [router.isReady, router.query.error])
	return (
		<Container centerContent h="100svh" justifyContent="center">
			<Heading my={2}>{t('login')}</Heading>
			{(failed || !!router.query.error) && (
				<Text role="alert" mb={2}>
					{t('loginFailed')}
				</Text>
			)}
			<Button onClick={() => void signIn()} isLoading={pending} size="lg">
				{t('signIn', { method: 'TIPSアカウント' })}
			</Button>
		</Container>
	)
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
	const session = await getServerSession(context.req, context.res)
	if (session) return { redirect: { destination: '/', permanent: false } }
	return { props: { ...(await serverSideTranslations(context.locale || 'en', ['common'])) } }
}
