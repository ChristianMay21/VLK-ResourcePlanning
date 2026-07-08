import styles from './ProjectListEntry.module.scss'

type ProjectListEntryProps = {
  name: string
  clientName: string
  startDate: string
  endDate: string
}

export default function ProjectListEntry(props: ProjectListEntryProps) {
  return (
    <div className={styles.root}>
      <span className={styles.name}>{props.name}</span>
      <span className={styles.client}>{props.clientName}</span>
      <span className={styles.date}>{new Date(props.startDate).toLocaleDateString()}</span>
      <span className={styles.date}>{new Date(props.endDate).toLocaleDateString()}</span>
    </div>
  )
}
