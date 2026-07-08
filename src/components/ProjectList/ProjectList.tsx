import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Client } from '@/payload-types'
import ProjectListEntry from '@/components/ProjectListEntry/ProjectListEntry'
import styles from './ProjectList.module.scss'

type ProjectListProps = {}

export default async function ProjectList(props: ProjectListProps) {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({ collection: 'projects', depth: 1 })

  return (
    <div className={styles.root}>
      <span className={styles.heading}>Project</span>
      <span className={styles.heading}>Client</span>
      <span className={styles.heading}>Start Date</span>
      <span className={styles.heading}>End Date</span>
      {docs.map((project) => (
        <ProjectListEntry
          key={project.id}
          name={project.name}
          clientName={typeof project.client === 'object' ? (project.client as Client).name : ''}
          startDate={project.startDate}
          endDate={project.endDate}
        />
      ))}
    </div>
  )
}
