/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
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
