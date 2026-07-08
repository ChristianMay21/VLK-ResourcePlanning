import styles from './ProjectDetail.module.scss'

type ProjectDetailProps = {
  name: string
  budget: number
  isComplete: boolean
  startDate: string
  endDate: string
}

export default function ProjectDetail(props: ProjectDetailProps) {
  return (
    <div className={styles.root}>
      <h2 className={styles.name}>{props.name}</h2>
      <dl className={styles.fields}>
        <dt className={styles.label}>Budget</dt>
        <dd className={styles.value}>${props.budget.toLocaleString()}</dd>

        <dt className={styles.label}>Start Date</dt>
        <dd className={styles.value}>{new Date(props.startDate).toLocaleDateString()}</dd>

        <dt className={styles.label}>End Date</dt>
        <dd className={styles.value}>{new Date(props.endDate).toLocaleDateString()}</dd>

        <dt className={styles.label}>Status</dt>
        <dd className={styles.value}>{props.isComplete ? 'Complete' : 'In Progress'}</dd>
      </dl>
    </div>
  )
}
