import Image from 'next/image'
import styles from './StaffCard.module.scss'

type StaffCardProps = {
  photoUrl: string
  name: string
  jobTitle: string
}

export default function StaffCard(props: StaffCardProps) {
  return (
    <div className={styles.root}>
      {props.photoUrl && (
        <Image className={styles.photo} src={props.photoUrl} alt={props.name} width={80} height={80} />
      )}
      <p className={styles.name}>{props.name}</p>
      <p className={styles.jobTitle}>{props.jobTitle}</p>
    </div>
  )
}
