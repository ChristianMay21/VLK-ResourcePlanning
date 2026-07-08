import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    loadPaths: [process.cwd()],
  },
}

export default withPayload(nextConfig)
