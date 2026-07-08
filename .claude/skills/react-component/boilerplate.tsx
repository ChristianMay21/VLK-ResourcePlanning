import styles from './BoilerplateComponent.module.scss'

type BoilerplateComponentProps = {}

export default function BoilerplateComponent(props: BoilerplateComponentProps) {
  return <div className={styles.root}></div>
}
