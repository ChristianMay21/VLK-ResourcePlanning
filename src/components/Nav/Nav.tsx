'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Nav.module.scss'

export default function Nav() {
  const pathname = usePathname()

  return (
    <header className={styles.root}>
      <span className={styles.wordmark}>Workload Planner</span>
      <nav className={styles.nav}>
        <Link className={styles.tab} href="/projects" data-active={pathname.startsWith('/projects')}>
          PROJECTS
        </Link>
        <Link className={styles.tab} href="/internal-work" data-active={pathname.startsWith('/internal-work')}>
          INTERNAL WORK
        </Link>
        <Link className={styles.tab} href="/employees" data-active={pathname.startsWith('/employees')}>
          STAFF
        </Link>
        <Link className={styles.tab} href="/settings" data-active={pathname.startsWith('/settings')}>
          ADMIN
        </Link>
      </nav>
    </header>
  )
}
