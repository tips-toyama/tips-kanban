import { ChakraProvider } from '@chakra-ui/react'
import { SessionProvider } from '@/auth/client'
import type { AppProps } from 'next/app'
import CSR from '../components/CSR'
import { appWithTranslation } from 'next-i18next'

function App({ Component, pageProps }: AppProps) {
	return (
		<CSR>
			<SessionProvider>
				<ChakraProvider>
					<Component {...pageProps} />
				</ChakraProvider>
			</SessionProvider>
		</CSR>
	)
}
export default appWithTranslation(App)
