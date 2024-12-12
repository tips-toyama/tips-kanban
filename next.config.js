/** @type {import('next').NextConfig} */

const { i18n } = require('./next-i18next.config')
const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
  })
const nextConfig = withPWA({
	transpilePackages: ['@mdxeditor/editor'],
	reactStrictMode: true,
	i18n,
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'storage.googleapis.com',
				port: '',
			},
		],
	},
})

module.exports = nextConfig
