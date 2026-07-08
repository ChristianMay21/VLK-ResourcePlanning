'use client'

import ProjectDetail from '@/components/ProjectDetail/ProjectDetail'
import { useModal } from '@/context/ModalContext'
import styles from './ProjectListEntry.module.scss'

type ProjectListEntryProps = {
  name: string
  clientName: string
  budget: number
  isComplete: boolean
  startDate: string
  endDate: string
}

export default function ProjectListEntry(props: ProjectListEntryProps) {
  const { setModal } = useModal()

  function handleClick() {
    setModal({
      component: ProjectDetail,
      componentProps: {
        name: props.name,
        budget: props.budget,
        isComplete: props.isComplete,
        startDate: props.startDate,
        endDate: props.endDate,
      },
    })
  }

  return (
    <div className={styles.root} onClick={handleClick}>
      <span className={styles.name}>{props.name}</span>
      <span className={styles.client}>{props.clientName}</span>
      <span className={styles.date}>{new Date(props.startDate).toLocaleDateString()}</span>
      <span className={styles.date}>{new Date(props.endDate).toLocaleDateString()}</span>
    </div>
  )
}
