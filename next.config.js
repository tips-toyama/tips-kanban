/** @type {import('next').NextConfig} */

const { i18n } = require('./next-i18next.config')
const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
	cacheStartUrl: false,
	runtimeCaching: [], // Authenticated pages and APIs must never enter the service worker cache.
	buildExcludes: [/middleware-manifest\.json$/],
  })
const nextConfig = withPWA({
	transpilePackages: ['@mdxeditor/editor'],
	reactStrictMode: true,
	i18n,
	async headers() {
		return [{ source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] }]
	},
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
