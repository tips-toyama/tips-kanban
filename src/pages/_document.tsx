import { Head, Html, Main, NextScript } from 'next/document'
import theme from '../styles/theme'
import { ColorModeScript } from '@chakra-ui/react'


export default function Document() {
	return (
		<Html>
			<Head>
				<link rel="manifest" href="/manifest.json" />
			</Head>
			<body>
				<ColorModeScript initialColorMode={theme.config.initialColorMode} />
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
