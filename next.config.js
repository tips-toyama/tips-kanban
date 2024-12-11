/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

module.exports = nextConfig
