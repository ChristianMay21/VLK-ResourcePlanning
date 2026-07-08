'use client'

import { useModal } from '@/context/ModalContext'
import type { ModalState } from '@/context/ModalContext'
import styles from './DialogTrigger.module.scss'

type DialogTriggerProps = {
  label: string
  dialog: ModalState
}

export default function DialogTrigger(props: DialogTriggerProps) {
  const { setModal } = useModal()

  return (
    <button className={styles.root} onClick={() => setModal(props.dialog)}>
      {props.label}
    </button>
  )
}
