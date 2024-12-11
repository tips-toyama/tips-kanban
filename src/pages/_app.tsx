import { ChakraProvider } from '@chakra-ui/react'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import CSR from '../components/CSR'

export default function App({ Component, pageProps }: AppProps) {
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
