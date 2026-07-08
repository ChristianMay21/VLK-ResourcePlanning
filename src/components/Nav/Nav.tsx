import Link from 'next/link'
import styles from './Nav.module.scss'

export default function Nav() {
  return (
    <nav className={styles.root}>
      <Link className={styles.link} href="/projects">Projects</Link>
      <Link className={styles.link} href="/staff">Staff</Link>
    </nav>
  )
}
