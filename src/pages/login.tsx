import type {
    GetServerSidePropsContext,
    InferGetServerSidePropsType,
} from "next"
import { getProviders, signIn } from "next-auth/react"
import { getServerSession } from "next-auth/next"
import { authOptions } from './api/auth/[...nextauth]'
import { Box, Button, Container, Heading, Text } from "@chakra-ui/react"
import { useEffect } from "react"
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export default function SignIn({
    providers,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const { t } = useTranslation('common')
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_SIGNIN_METHOD) signIn(process.env.NEXT_PUBLIC_SIGNIN_METHOD)
    }, [])
    return (
        <Container centerContent={true} h="100svh" justifyContent="center">
            <Heading my={2}>{t('login')}</Heading>
            {Object.values(providers).map((provider) => (
                <Box key={provider.name}>
                    <Button onClick={() => signIn(provider.id)} size="lg">
                        {t('signIn', { method: provider.name })}
                    </Button>
                </Box>
            ))}
        </Container>
    )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
    const session = await getServerSession(context.req, context.res, authOptions)

    // If the user is already logged in, redirect.
    // Note: Make sure not to redirect to the same page
    // To avoid an infinite loop!
    if (session) {
        return { redirect: { destination: "/" } }
    }

    const providers = await getProviders()

    return {
        props: {
            providers: providers ?? [],
            ...(await serverSideTranslations(context.locale || 'en', [
                'common',
            ])),
        },
    }
}
