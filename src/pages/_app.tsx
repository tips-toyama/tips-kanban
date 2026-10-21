import { ChakraProvider } from '@chakra-ui/react'
import { appWithTranslation } from 'next-i18next'
import type { AppProps } from 'next/app'
import CSR from '../components/CSR'

function App({ Component, pageProps }: AppProps) {
	return (
		<CSR>
			<ChakraProvider>
				<Component {...pageProps} />
			</ChakraProvider>
		</CSR>
	)
}
export default appWithTranslation(App)
