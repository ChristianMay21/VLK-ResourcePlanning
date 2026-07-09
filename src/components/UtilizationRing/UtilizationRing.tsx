import styles from './UtilizationRing.module.scss'
import { ringBackground, ringBackgroundSplit, utilizationColor } from '@/lib/utilization'
import { getInitials } from '@/lib/dateUtils'

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
  billablePct?: number
  internalPct?: number
}

export default function UtilizationRing(props: UtilizationRingProps) {
  const { outer, inner, fontSize } = SIZE_MAP[props.size]
  const pctRounded = Math.round(props.pct)

  const hasSplit = props.billablePct != null && props.internalPct != null
  const ringBg = hasSplit
    ? ringBackgroundSplit(props.billablePct!, props.internalPct!)
    : ringBackground(props.pct, utilizationColor(props.pct))

  let tooltip: string
  if (hasSplit && props.windowWeeks) {
    const b = Math.round(props.billablePct!)
    const n = Math.round(props.internalPct!)
    tooltip = `${b}% billable + ${n}% internal work = ${pctRounded}% total utilized (Next ${props.windowWeeks} weeks)`
  } else if (props.windowWeeks) {
    tooltip = `${pctRounded}% utilized (Next ${props.windowWeeks} weeks)`
  } else {
    tooltip = `${pctRounded}% utilized`
  }

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
