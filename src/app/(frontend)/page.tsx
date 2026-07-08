import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import Main from '../components/Main'
import ProjectList from '@/components/ProjectList/ProjectList'
import './styles.scss'

export default async function HomePage() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })

  return (
    <>
      <Main />
      <ProjectList />
    </>
  )
}
