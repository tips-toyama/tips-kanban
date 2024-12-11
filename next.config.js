/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
	dest: 'public'
  })
const nextConfig = withPWA({
	transpilePackages: ['@mdxeditor/editor'],
	reactStrictMode: true,
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
