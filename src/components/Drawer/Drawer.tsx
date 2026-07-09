'use client'

import { useDrawer } from '@/context/DrawerContext'
import styles from './Drawer.module.scss'

export default function Drawer() {
  const { drawer, setDrawer } = useDrawer()

  if (!drawer) return null

  // Cast to decouple component/props correlation — DrawerState's discriminated union
  // guarantees they match at call sites; the intersection TypeScript infers here is unreachable.
  const d = drawer as unknown as { component: React.ComponentType<Record<string, unknown>>; componentProps: Record<string, unknown> }

  return (
    <div className={styles.backdrop} onClick={() => setDrawer(null)}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={() => setDrawer(null)}>
          × CLOSE
        </button>
        <d.component {...d.componentProps} />
      </div>
    </div>
  )
}
