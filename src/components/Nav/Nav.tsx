'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Nav.module.scss'

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className={styles.root}>
      <Link className={styles.link} href="/projects" data-active={pathname === '/projects'}>Projects</Link>
      <Link className={styles.link} href="/staff" data-active={pathname === '/staff'}>Staff</Link>
    </nav>
  )
}
