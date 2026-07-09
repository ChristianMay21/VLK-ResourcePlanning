'use client'

import { useDrawer } from '@/context/DrawerContext'
import ProjectForm from '@/components/ProjectForm/ProjectForm'
import styles from './NewProjectButton.module.scss'

type NewProjectButtonProps = {}

export default function NewProjectButton(props: NewProjectButtonProps) {
  void props
  const { setDrawer } = useDrawer()

  function handleClick() {
    setDrawer({ component: ProjectForm, componentProps: {} })
  }

  return (
    <button type="button" className={styles.root} onClick={handleClick}>
      + NEW PROJECT
    </button>
  )
}
