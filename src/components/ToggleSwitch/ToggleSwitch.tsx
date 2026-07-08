'use client'

import { useState } from 'react'
import styles from './ToggleSwitch.module.scss'

type ToggleSwitchProps = {
  label: string
}

export default function ToggleSwitch(props: ToggleSwitchProps) {
  const [isOn, setIsOn] = useState(false)

  return (
    <label className={styles.root}>
      <input
        className={styles.input}
        type="checkbox"
        checked={isOn}
        onChange={() => setIsOn(!isOn)}
      />
      <span className={styles.label}>{props.label}</span>
    </label>
  )
}
