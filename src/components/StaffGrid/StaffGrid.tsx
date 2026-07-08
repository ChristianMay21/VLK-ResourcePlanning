import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Media } from '@/payload-types'
import StaffCard from '@/components/StaffCard/StaffCard'
import styles from './StaffGrid.module.scss'

type StaffGridProps = {}

export default async function StaffGrid(props: StaffGridProps) {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({ collection: 'employees', depth: 1 })

  return (
    <div className={styles.root}>
      {docs.map((employee) => (
        <StaffCard
          key={employee.id}
          name={employee.name}
          jobTitle={employee.jobTitle ?? ''}
          photoUrl={typeof employee.photo === 'object' && employee.photo ? (employee.photo as Media).url ?? '' : ''}
        />
      ))}
    </div>
  )
}
