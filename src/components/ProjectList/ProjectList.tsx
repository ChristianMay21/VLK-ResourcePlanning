import { getPayload } from 'payload'
import config from '@/payload.config'
import ProjectListEntry from '@/components/ProjectListEntry/ProjectListEntry'
import styles from './ProjectList.module.scss'

type ProjectListProps = {}

export default async function ProjectList(props: ProjectListProps) {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({ collection: 'projects' })

  return (
    <div className={styles.root}>
      {docs.map((project) => (
        <ProjectListEntry key={project.id} name={project.name} />
      ))}
    </div>
  )
}
