import styles from './ProjectListEntry.module.scss'

type ProjectListEntryProps = {
  name: string
}

export default function ProjectListEntry(props: ProjectListEntryProps) {
  return <div className={styles.root}>{props.name}</div>
}
