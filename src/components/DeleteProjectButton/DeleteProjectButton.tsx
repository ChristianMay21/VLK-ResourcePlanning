'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './DeleteProjectButton.module.scss'

type DeleteProjectButtonProps = {
  projectId: string
  projectName: string
}

export default function DeleteProjectButton(props: DeleteProjectButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    const res = await fetch(`/api/admin-projects/${props.projectId}`, { method: 'DELETE' })
    if (!res.ok) {
      setDeleting(false)
      setConfirming(false)
      alert('Failed to delete project.')
      return
    }
    router.push('/projects')
  }

  if (confirming) {
    return (
      <div className={styles.confirm}>
        <span className={styles.confirmText}>
          Delete &ldquo;{props.projectName}&rdquo;? All phases, tasks, and assignments will be permanently removed.
        </span>
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={deleting}
        >
          {deleting ? 'DELETING…' : 'CONFIRM DELETE'}
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          CANCEL
        </button>
      </div>
    )
  }

  return (
    <button type="button" className={styles.deleteBtn} onClick={() => setConfirming(true)}>
      DELETE PROJECT
    </button>
  )
}
