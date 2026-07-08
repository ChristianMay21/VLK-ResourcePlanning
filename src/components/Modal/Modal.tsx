'use client'

import { useModal } from '@/context/ModalContext'
import styles from './Modal.module.scss'

type ModalProps = {}

export default function Modal(props: ModalProps) {
  const { modal, setModal } = useModal()

  if (!modal) return null

  const Component = modal.component

  return (
    <div className={styles.root}>
      <div className={styles.panel}>
        <button className={styles.close} onClick={() => setModal(null)}>✕</button>
        <Component {...modal.componentProps} />
      </div>
    </div>
  )
}
