import styles from './UtilizationRing.module.scss'
import { ringBackground, utilizationColor } from '@/lib/utilization'
import { getInitials } from '@/lib/dateUtils'

// Size variants match the spec's three avatar sizes
const SIZE_MAP = {
  xs: { outer: 24, inner: 18, fontSize: 8 },
  sm: { outer: 40, inner: 32, fontSize: 12 },
  md: { outer: 52, inner: 44, fontSize: 15 },
  lg: { outer: 66, inner: 56, fontSize: 19 },
}

type UtilizationRingProps = {
  pct: number
  name: string
  avatarColor: string
  size: 'xs' | 'sm' | 'md' | 'lg'
  windowWeeks?: number
}

export default function UtilizationRing(props: UtilizationRingProps) {
  const { outer, inner, fontSize } = SIZE_MAP[props.size]
  const ringColor = utilizationColor(props.pct)
  const ringBg = ringBackground(props.pct, ringColor)
  const pctRounded = Math.round(props.pct)
  const tooltip = props.windowWeeks
    ? `${pctRounded}% utilized (Next ${props.windowWeeks} weeks)`
    : `${pctRounded}% utilized`

  return (
    <span
      className={styles.root}
      style={{ width: outer, height: outer, background: ringBg }}
      title={tooltip}
    >
      <span
        className={styles.avatar}
        style={{
          width: inner,
          height: inner,
          background: props.avatarColor,
          fontSize,
        }}
      >
        {getInitials(props.name)}
      </span>
    </span>
  )
}
